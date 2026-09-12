/**
 * Moteur de calcul déterministe du coût d'immatriculation (carte grise + malus)
 * pour l'import d'un véhicule d'occasion en France.
 *
 * RÈGLE ABSOLUE : ce module est la SEULE source de vérité pour tout montant en euros
 * présenté à l'utilisateur. L'IA conversationnelle (voir server.js) ne fait jamais de
 * calcul elle-même — elle appelle uniquement `calculerCoutImport()` et restitue son
 * résultat, y compris ses avertissements de confiance.
 *
 * Quand une donnée nécessaire n'est pas disponible avec une confiance suffisante,
 * la fonction renvoie une erreur explicite plutôt qu'un chiffre inventé.
 */

const {
  BAREME_CO2_PAR_ANNEE,
  TRANCHES_DECOTE_MOIS,
  TARIF_CV_PAR_DEPARTEMENT_2026,
  FRAIS_FIXES,
  MALUS_POIDS_INTRODUIT_LE,
} = require("./bareme-data");

/**
 * @typedef {Object} EntreeCalcul
 * @property {string} departement - Code département à 2 chiffres, ex. "06"
 * @property {number} cvFiscaux - Puissance administrative en chevaux fiscaux (rubrique P.6)
 * @property {number} co2GKm - Émissions de CO2 en g/km (rubrique V.7 / COC)
 * @property {string} dateMiseEnCirculation - Date de 1ère mise en circulation, format AAAA-MM-JJ
 * @property {string} [dateCalcul] - Date du calcul (import/démarche), AAAA-MM-JJ. Défaut : aujourd'hui.
 * @property {number} [poidsKg] - Masse en ordre de marche en kg (optionnel)
 * @property {boolean} [electriqueOuHydrogene] - true si électrique/hydrogène (exonéré)
 */

/** Nombre de mois entre deux dates, compté de façon glissante et arrondi à l'unité
 *  supérieure (tout mois entamé compte comme un mois complet) — règle confirmée par
 *  deux exemples chiffrés du BOFiP (26 mois et 73 mois, tous deux reproduits exactement
 *  par cette fonction). */
function moisEntreDates(dateDebut, dateFin) {
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  let mois = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() > d1.getDate()) mois += 1;
  return Math.max(0, mois);
}

/**
 * Coefficient forfaitaire de décote — barème par palier fixe (pas d'interpolation),
 * source primaire BOFiP confirmée (voir bareme-data.js). Confiance "confirme" pour
 * toute tranche puisque c'est le texte de loi lui-même, pas une estimation.
 */
function getCoefficientDecote(ageMois) {
  const tranche = TRANCHES_DECOTE_MOIS.find((t) => ageMois >= t.min && ageMois <= t.max);
  if (!tranche) return { decote: 1.0, confiance: "confirme" }; // au-delà de 181 mois : exonération totale
  return { decote: tranche.decote, confiance: "confirme" };
}

function getMalusCO2Brut(anneeImmatriculation, co2) {
  const bareme = BAREME_CO2_PAR_ANNEE[anneeImmatriculation];
  if (!bareme) return null;
  if (co2 < bareme.seuil) return { montant: 0, confiance: bareme.confiance };
  if (co2 >= bareme.plafondCo2) return { montant: bareme.plafondMontant, confiance: bareme.confiance };

  const grille = bareme.grille;
  const exact = grille.find((e) => e.co2 === co2);
  if (exact) return { montant: exact.montant, confiance: bareme.confiance };

  // Interpole entre les deux points encadrants (la grille a des trous, ex. 150-153 en 2018).
  let avant = grille[0];
  let apres = grille[grille.length - 1];
  for (let i = 0; i < grille.length - 1; i++) {
    if (grille[i].co2 <= co2 && grille[i + 1].co2 >= co2) {
      avant = grille[i];
      apres = grille[i + 1];
      break;
    }
  }
  if (avant.co2 === apres.co2) return { montant: avant.montant, confiance: bareme.confiance };
  const fraction = (co2 - avant.co2) / (apres.co2 - avant.co2);
  const montant = avant.montant + fraction * (apres.montant - avant.montant);
  return { montant: Math.round(montant), confiance: "interpole" };
}

function getTarifRegional(departement) {
  const entree = TARIF_CV_PAR_DEPARTEMENT_2026[departement];
  if (!entree) return null;
  return entree;
}

/**
 * Calcule le coût total d'immatriculation (carte grise + malus) pour l'import
 * d'un véhicule d'occasion. Retourne { ok: false, erreur } si une donnée
 * indispensable n'est pas disponible dans les tables de barème connues,
 * plutôt que d'inventer un chiffre.
 *
 * @param {EntreeCalcul} entree
 */
function calculerCoutImport(entree) {
  const avertissements = [];
  const lignes = [];

  if (!entree || typeof entree !== "object") {
    return { ok: false, erreur: "Entrée invalide : objet attendu." };
  }
  const { departement, cvFiscaux, co2GKm, dateMiseEnCirculation, poidsKg, electriqueOuHydrogene } = entree;
  if (!departement || typeof departement !== "string") {
    return { ok: false, erreur: "Le département est requis (ex. \"06\")." };
  }
  if (typeof cvFiscaux !== "number" || !(cvFiscaux > 0)) {
    return { ok: false, erreur: "La puissance fiscale (cvFiscaux) doit être un nombre positif." };
  }
  if (typeof co2GKm !== "number" || co2GKm < 0) {
    return { ok: false, erreur: "Le CO2 (co2GKm) doit être un nombre positif ou nul." };
  }
  if (!dateMiseEnCirculation || Number.isNaN(new Date(dateMiseEnCirculation).getTime())) {
    return { ok: false, erreur: `Date de mise en circulation invalide : "${dateMiseEnCirculation}"` };
  }

  const dateCalcul = entree.dateCalcul ?? new Date().toISOString().slice(0, 10);
  if (Number.isNaN(new Date(dateCalcul).getTime())) {
    return { ok: false, erreur: `Date de calcul invalide : "${dateCalcul}"` };
  }
  const anneeImmatriculation = new Date(dateMiseEnCirculation).getFullYear();

  // --- Y1 : taxe régionale (cheval fiscal) ---
  const tarifRegional = getTarifRegional(departement);
  if (!tarifRegional) {
    return {
      ok: false,
      erreur:
        `Tarif régional du cheval fiscal non connu pour le département "${departement}". ` +
        `Seul le département 06 (Alpes-Maritimes) est confirmé à ce jour. ` +
        `Merci de vérifier le tarif officiel de la région pour ce département avant de poursuivre.`,
    };
  }
  const ageMoisPourY1 = moisEntreDates(dateMiseEnCirculation, dateCalcul);
  const decoteY1 = ageMoisPourY1 > 120 ? 0.5 : 1.0; // règle générale : décote régionale de 50% au-delà de 10 ans
  const montantY1 = Math.round(cvFiscaux * tarifRegional.tarif * decoteY1);
  lignes.push({
    code: "Y1",
    libelle: "Taxe régionale (cheval fiscal)",
    montant: montantY1,
    confiance: tarifRegional.confiance,
    detail: `${cvFiscaux} CV × ${tarifRegional.tarif.toFixed(2)} €/CV${decoteY1 < 1 ? " × 50% (véhicule >10 ans)" : ""}, arrondi à l'euro`,
  });

  // --- Y3 : malus CO2 (+ poids, si applicable) ---
  let montantY3 = 0;
  let confianceY3 = "confirme";
  const detailsY3 = [];

  if (electriqueOuHydrogene) {
    detailsY3.push("Véhicule électrique/hydrogène : exonéré de malus CO2");
  } else {
    const malusBrut = getMalusCO2Brut(anneeImmatriculation, co2GKm);
    if (!malusBrut) {
      return {
        ok: false,
        erreur:
          `Barème malus CO2 non disponible pour l'année de première immatriculation ${anneeImmatriculation}. ` +
          `Seule l'année 2018 est documentée à ce jour dans ce moteur de calcul. ` +
          `Il faut compléter lib/bareme-data.js avant de pouvoir traiter ce cas — ne pas deviner un montant.`,
      };
    }
    let malusApresDecote = malusBrut.montant;
    confianceY3 = malusBrut.confiance;

    const ageMoisPourMalus = moisEntreDates(dateMiseEnCirculation, dateCalcul);
    const { decote, confiance: confianceDecote } = getCoefficientDecote(ageMoisPourMalus);
    // Arrondi à l'euro entier après application de la décote, comme dans les exemples
    // chiffrés du BOFiP (ex. 7462 × 0,72 = 5372,64 → arrondi à 5373€).
    malusApresDecote = Math.round(malusBrut.montant * (1 - decote));
    detailsY3.push(
      `Malus brut barème ${anneeImmatriculation} @ ${co2GKm}g/km = ${malusBrut.montant}€, ` +
        `décote d'âge (${ageMoisPourMalus} mois, tranche BOFiP) = ${(decote * 100).toFixed(0)}%, arrondi à l'euro`
    );
    confianceY3 = confianceDecote === "estime" || confianceY3 === "estime" ? "estime" : confianceDecote;
    if (ageMoisPourMalus >= 181) {
      detailsY3.push("Véhicule de plus de 181 mois (15 ans) : exonération totale");
      malusApresDecote = 0;
    }
    montantY3 = malusApresDecote;

    // Malus poids : uniquement si 1ère immatriculation à partir du 1er janvier 2022.
    const dateIntroPoids = new Date(MALUS_POIDS_INTRODUIT_LE);
    if (new Date(dateMiseEnCirculation) >= dateIntroPoids) {
      avertissements.push(
        "Ce véhicule est immatriculé après le 1er janvier 2022 : un malus au poids (TMOM) pourrait " +
          "s'appliquer en plus du malus CO2, mais ce moteur de calcul ne dispose pas encore d'une grille " +
          "poids fiable (divergence non résolue entre sources — voir docs/recherche-malus-carte-grise.md). " +
          "Le montant Y3 ci-dessous ne couvre QUE la composante CO2."
      );
    }
  }
  lignes.push({
    code: "Y3",
    libelle: "Malus CO2" + (poidsKg ? " et poids (TMOM)" : ""),
    montant: montantY3,
    confiance: confianceY3,
    detail: detailsY3.join(" — ") || "Exonéré",
  });

  // --- Y4 / Y5 : frais fixes ---
  lignes.push({
    code: "Y4",
    libelle: "Redevance d'acheminement",
    montant: FRAIS_FIXES.y4,
    confiance: FRAIS_FIXES.confiance,
    detail: "Montant fixe",
  });
  lignes.push({
    code: "Y5",
    libelle: "Frais de gestion",
    montant: FRAIS_FIXES.y5,
    confiance: FRAIS_FIXES.confiance,
    detail: "Montant fixe",
  });

  const total = Math.round(lignes.reduce((s, l) => s + l.montant, 0) * 100) / 100;

  if (lignes.some((l) => l.confiance !== "confirme")) {
    avertissements.push(
      "Certaines lignes reposent sur des données estimées ou interpolées (voir le détail de chaque ligne), " +
        "pas sur un texte légal primaire consulté directement pour CETTE ligne précise. Ce total est une " +
        "estimation motivée, pas une garantie au centime près. Voir docs/recherche-malus-carte-grise.md."
    );
  }

  return { ok: true, lignes, total, avertissements };
}

module.exports = { calculerCoutImport, moisEntreDates, getCoefficientDecote, getMalusCO2Brut };

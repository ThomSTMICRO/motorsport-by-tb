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
  BAREME_POIDS_PAR_ANNEE,
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

/**
 * Nombre de mois entre deux dates, compté de façon glissante et arrondi à l'unité
 * supérieure (tout mois entamé compte comme un mois complet).
 *
 * Règle confirmée par DEUX exemples chiffrés du BOFiP (26 mois et 73 mois) ET par un
 * 3e cas réel obtenu directement sur le simulateur officiel (13/09/2026) : véhicule
 * immatriculé le 13/09/2019, calcul fait le 13/09/2026 — EXACTEMENT 7 ans jour pour
 * jour (84 mois calendaires pleins). Le simulateur officiel applique pourtant la
 * décote de la tranche 85-96 mois (53%), pas 73-84 (48%) : 4 890€ (malus CO2 brut
 * 2019 @ 170g/km, déjà confirmé via l'API) × 47% retenu = 2 298,30€, exactement la
 * valeur affichée par le simulateur (Y3 = 2 298,30€, dépt 38/Isère, 32 CV, Y1 = 1 376€
 * confirmé aussi). Conclusion : sur une date anniversaire EXACTE (même jour du mois),
 * un mois supplémentaire est entamé — d'où le `>=` ci-dessous (et non `>`). Vérifié :
 * ce changement ne casse aucun des deux exemples BOFiP (qui ne tombent pas sur une
 * date anniversaire exacte).
 */
function moisEntreDates(dateDebut, dateFin) {
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  let mois = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() >= d1.getDate()) mois += 1;
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

/**
 * Résout le malus CO2 brut (avant décote d'âge) pour une année et un CO2 donnés.
 * Renvoie `null` si l'année n'est pas dans BAREME_CO2_PAR_ANNEE OU si le CO2 est
 * hors de la plage échantillonnée pour CETTE année (chaque grille a ses propres bornes
 * min/max — 100-220 g/km pour les 7 premières années interrogées, 90-230 g/km pour les
 * 8 complétées ensuite) — ne jamais extrapoler au-delà de ce qui a été réellement
 * interrogé sur l'API officielle.
 */
function getMalusCO2Brut(anneeImmatriculation, co2) {
  const bareme = BAREME_CO2_PAR_ANNEE[anneeImmatriculation];
  if (!bareme) return null;
  const grille = bareme.grille;
  if (co2 < grille[0].co2 || co2 > grille[grille.length - 1].co2) return null; // hors plage confirmée pour cette année

  const exact = grille.find((e) => e.co2 === co2);
  if (exact) return { montant: exact.montant, confiance: bareme.confiance };

  // Interpole entre les deux points encadrants les plus proches (grille échantillonnée
  // tous les 5 g/km, avec ponctuellement un point exact supplémentaire comme 162 en 2018).
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

/**
 * Résout le malus poids (TMOM) brut pour une année et un poids donnés, selon le
 * barème PAR TRANCHES MARGINALES confirmé via l'API officielle (voir bareme-data.js).
 * Renvoie `null` si l'année n'a pas de malus poids connu (avant 2022, ou année non
 * encore interrogée).
 */
function getMalusPoidsBrut(anneeImmatriculation, poidsKg) {
  const bareme = BAREME_POIDS_PAR_ANNEE[anneeImmatriculation];
  if (!bareme) return null;
  const tranche = bareme.tranches.find((t) => poidsKg >= t.debutKg && poidsKg <= t.finKg);
  if (!tranche) return null;
  const montant = tranche.baseAvant + (poidsKg - tranche.debutKg) * tranche.prixParKg;
  return { montant: Math.round(montant), confiance: bareme.confiance };
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
  // ⚠️ PAS d'arrondi individuel ici (voir note sur le calcul du total plus bas) : le
  // simulateur officiel n'arrondit que le sous-total Y1+Y2+Y3+Y4, pas chaque ligne.
  const montantY1 = Math.round(cvFiscaux * tarifRegional.tarif * decoteY1 * 100) / 100;
  lignes.push({
    code: "Y1",
    libelle: "Taxe régionale (cheval fiscal)",
    montant: montantY1,
    confiance: tarifRegional.confiance,
    detail: `${cvFiscaux} CV × ${tarifRegional.tarif.toFixed(2)} €/CV${decoteY1 < 1 ? " × 50% (véhicule >10 ans)" : ""}`,
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
      const anneesConnues = Object.keys(BAREME_CO2_PAR_ANNEE).join(", ");
      return {
        ok: false,
        erreur:
          `Barème malus CO2 non disponible pour l'année ${anneeImmatriculation} et/ou le CO2 ${co2GKm}g/km. ` +
          `Années confirmées à ce jour : ${anneesConnues} (plage 100-220 g/km uniquement). ` +
          `Il faut compléter lib/bareme-data.js avant de pouvoir traiter ce cas — ne pas deviner un montant.`,
      };
    }
    confianceY3 = malusBrut.confiance;

    // Malus poids (TMOM) : uniquement si 1ère immatriculation à partir du 1er janvier 2022
    // ET si un poids a été fourni ET si l'année a une grille poids confirmée.
    let malusPoidsBrut = null;
    const dateIntroPoids = new Date(MALUS_POIDS_INTRODUIT_LE);
    const applicablePoids = new Date(dateMiseEnCirculation) >= dateIntroPoids;
    if (applicablePoids) {
      if (typeof poidsKg === "number" && poidsKg > 0) {
        malusPoidsBrut = getMalusPoidsBrut(anneeImmatriculation, poidsKg);
        if (!malusPoidsBrut) {
          avertissements.push(
            `Ce véhicule est immatriculé après le 1er janvier 2022 : un malus au poids (TMOM) pourrait ` +
              `s'appliquer, mais aucune grille poids confirmée n'existe pour l'année ${anneeImmatriculation} ` +
              `dans ce moteur de calcul. Le montant Y3 ci-dessous ne couvre QUE la composante CO2.`
          );
        }
      } else {
        avertissements.push(
          "Ce véhicule est immatriculé après le 1er janvier 2022 : un malus au poids (TMOM) pourrait " +
            "s'appliquer en plus du malus CO2, mais aucun poids (poidsKg) n'a été fourni. Le montant Y3 " +
            "ci-dessous ne couvre QUE la composante CO2."
        );
      }
    }

    const malusCombineBrut = malusBrut.montant + (malusPoidsBrut ? malusPoidsBrut.montant : 0);

    const ageMoisPourMalus = moisEntreDates(dateMiseEnCirculation, dateCalcul);
    const { decote, confiance: confianceDecote } = getCoefficientDecote(ageMoisPourMalus);
    // ⚠️ PAS d'arrondi individuel à l'euro ici (contrairement à ce qui était supposé
    // précédemment à partir des exemples BOFiP isolés). Cas réel de calibration #2
    // (simulateur officiel, 13/09/2026, véhicule 2019/dépt 38) : Y3 affiché avec des
    // centimes (2 298,30€ = 4890 × 0,47 exactement, non arrondi) — c'est le SOUS-TOTAL
    // Y1+Y2+Y3+Y4 qui est arrondi à l'euro, une seule fois, pas chaque ligne (voir plus
    // bas dans le calcul du total). Gardé ici avec centimes.
    let malusApresDecote = Math.round(malusCombineBrut * (1 - decote) * 100) / 100;

    // Plafonnement légal : (malus CO2 + malus poids) ne peut jamais dépasser le plafond
    // du barème CO2 de l'année, quand ce plafond est confirmé (voir bareme-data.js).
    const bareme = BAREME_CO2_PAR_ANNEE[anneeImmatriculation];
    if (bareme.plafondMontant != null && malusApresDecote > bareme.plafondMontant) {
      malusApresDecote = bareme.plafondMontant;
      detailsY3.push(`Plafonné au maximum du barème ${anneeImmatriculation} (${bareme.plafondMontant}€)`);
    }

    detailsY3.unshift(
      `Malus CO2 brut barème ${anneeImmatriculation} @ ${co2GKm}g/km = ${malusBrut.montant}€` +
        (malusPoidsBrut ? ` + malus poids brut @ ${poidsKg}kg = ${malusPoidsBrut.montant}€` : "") +
        `, décote d'âge (${ageMoisPourMalus} mois, tranche BOFiP) = ${(decote * 100).toFixed(0)}%`
    );
    confianceY3 = confianceDecote === "estime" || confianceY3 === "estime" ? "estime" : confianceDecote;
    if (malusPoidsBrut && malusPoidsBrut.confiance === "estime") confianceY3 = "estime";
    if (ageMoisPourMalus >= 181) {
      detailsY3.push("Véhicule de plus de 181 mois (15 ans) : exonération totale");
      malusApresDecote = 0;
    }
    montantY3 = malusApresDecote;
  }
  lignes.push({
    code: "Y3",
    libelle: "Malus CO2" + (poidsKg ? " et poids (TMOM)" : ""),
    montant: montantY3,
    confiance: confianceY3,
    detail: detailsY3.join(" — ") || "Exonéré",
  });

  // --- Y4 : taxe fixe (libellé confirmé par le simulateur officiel, cas réel #2) ---
  lignes.push({
    code: "Y4",
    libelle: "Taxe fixe",
    montant: FRAIS_FIXES.y4,
    confiance: FRAIS_FIXES.confiance,
    detail: "Montant fixe",
  });

  // --- Total : arrondi du SOUS-TOTAL Y1+Y2+Y3+Y4 à l'euro, PUIS ajout de Y5 ---
  // ✅ Règle confirmée par 2 cas réels (Q5 2018 et cas réel #2, simulateur officiel,
  // 13/09/2026) : Y1 et Y3 sont gardés avec centimes (pas d'arrondi individuel), et
  // c'est la SOMME Y1+Y2+Y3+Y4 qui est arrondie une seule fois à l'euro entier — le
  // libellé officiel l'affiche explicitement comme "Sous-total arrondi". Y5 (redevance
  // d'acheminement, avec centimes) est ajouté APRÈS cet arrondi pour obtenir le total.
  // Vérifié : reproduit exactement 2 786,76€ (Q5) et 3 687,76€ (cas réel #2).
  const sousTotal = lignes.reduce((s, l) => s + l.montant, 0); // Y2 (majoration transport) non modélisé, toujours 0
  const sousTotalArrondi = Math.round(sousTotal);
  lignes.push({
    code: "Y5",
    libelle: "Redevance d'acheminement",
    montant: FRAIS_FIXES.y5,
    confiance: FRAIS_FIXES.confiance,
    detail: `Ajoutée après arrondi du sous-total Y1+Y2+Y3+Y4 (${sousTotal.toFixed(2)}€ → ${sousTotalArrondi}€)`,
  });
  const total = Math.round((sousTotalArrondi + FRAIS_FIXES.y5) * 100) / 100;

  if (lignes.some((l) => l.confiance !== "confirme")) {
    avertissements.push(
      "Certaines lignes reposent sur des données estimées ou interpolées (voir le détail de chaque ligne), " +
        "pas sur un texte légal primaire consulté directement pour CETTE ligne précise. Ce total est une " +
        "estimation motivée, pas une garantie au centime près. Voir docs/recherche-malus-carte-grise.md."
    );
  }

  return { ok: true, lignes, total, avertissements };
}

module.exports = {
  calculerCoutImport,
  moisEntreDates,
  getCoefficientDecote,
  getMalusCO2Brut,
  getMalusPoidsBrut,
};

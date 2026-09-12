/**
 * Moteur de calcul déterministe du coût d'immatriculation (carte grise + malus)
 * pour l'import d'un véhicule d'occasion en France.
 *
 * RÈGLE ABSOLUE : ce module est la SEULE source de vérité pour tout montant en euros
 * présenté à l'utilisateur. L'IA conversationnelle (voir app/api/chat/route.ts) ne fait
 * jamais de calcul elle-même — elle appelle uniquement `calculerCoutImport()` et restitue
 * son résultat, y compris ses avertissements de confiance.
 *
 * Quand une donnée nécessaire n'est pas disponible avec une confiance suffisante,
 * la fonction renvoie une erreur explicite plutôt qu'un chiffre inventé.
 */

import {
  BAREME_CO2_PAR_ANNEE,
  POINTS_DECOTE_MOIS,
  TARIF_CV_PAR_DEPARTEMENT_2026,
  FRAIS_FIXES,
  MALUS_POIDS_INTRODUIT_LE,
  type Confiance,
} from "./bareme-data";

export interface EntreeCalcul {
  /** Code département à 2 chiffres, ex. "06" */
  departement: string;
  /** Puissance administrative en chevaux fiscaux (rubrique P.6 de la carte grise) */
  cvFiscaux: number;
  /** Émissions de CO2 en g/km (rubrique V.7 / COC), pour les véhicules au barème CO2 */
  co2GKm: number;
  /** Date de première mise en circulation du véhicule, au format AAAA-MM-JJ */
  dateMiseEnCirculation: string;
  /** Date à laquelle le calcul est effectué (import / démarche), AAAA-MM-JJ. Par défaut : aujourd'hui. */
  dateCalcul?: string;
  /** Poids en kg (masse en ordre de marche), optionnel — ignoré si véhicule immatriculé avant 2022 */
  poidsKg?: number;
  /** true si le véhicule est électrique ou à hydrogène (exonéré de malus CO2) */
  electriqueOuHydrogene?: boolean;
}

export interface LigneResultat {
  code: "Y1" | "Y3" | "Y4" | "Y5";
  libelle: string;
  montant: number;
  confiance: Confiance;
  detail: string;
}

export interface ResultatCalcul {
  ok: true;
  lignes: LigneResultat[];
  total: number;
  avertissements: string[];
}

export interface ErreurCalcul {
  ok: false;
  erreur: string;
}

function moisEntreDates(dateDebut: string, dateFin: string): number {
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  let mois = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() > d1.getDate()) mois += 1; // arrondi au mois supérieur, comme le texte légal
  return Math.max(0, mois);
}

/** Interpolation linéaire entre les points de décote connus les plus proches. */
function getCoefficientDecote(ageMois: number): { decote: number; confiance: Confiance } {
  const points = POINTS_DECOTE_MOIS;
  if (ageMois >= points[points.length - 1].mois) {
    return { decote: 1.0, confiance: "estime" };
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (ageMois >= a.mois && ageMois <= b.mois) {
      const fraction = b.mois === a.mois ? 0 : (ageMois - a.mois) / (b.mois - a.mois);
      const decote = a.decote + fraction * (b.decote - a.decote);
      const confiance: Confiance = a.confiance === "confirme" || b.confiance === "confirme" ? "interpole" : "estime";
      return { decote, confiance };
    }
  }
  return { decote: 0, confiance: "estime" };
}

function getMalusCO2Brut(anneeImmatriculation: number, co2: number): { montant: number; confiance: Confiance } | null {
  const bareme = BAREME_CO2_PAR_ANNEE[anneeImmatriculation];
  if (!bareme) return null;
  if (co2 < bareme.seuil) return { montant: 0, confiance: bareme.confiance };
  if (co2 >= bareme.plafondCo2) return { montant: bareme.plafondMontant, confiance: bareme.confiance };

  const grille = bareme.grille;
  // Cherche une valeur exacte d'abord.
  const exact = grille.find((e) => e.co2 === co2);
  if (exact) return { montant: exact.montant, confiance: bareme.confiance };

  // Sinon interpole entre les deux points encadrants (la grille a des trous, ex. 150-153 en 2018).
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

function getTarifRegional(departement: string): { tarif: number; confiance: Confiance } | null {
  const entree = TARIF_CV_PAR_DEPARTEMENT_2026[departement];
  if (!entree) return null;
  return entree;
}

/**
 * Calcule le coût total d'immatriculation (carte grise + malus) pour l'import
 * d'un véhicule d'occasion. Retourne une erreur explicite si une donnée
 * indispensable n'est pas disponible dans les tables de barème connues,
 * plutôt que d'inventer un chiffre.
 */
export function calculerCoutImport(entree: EntreeCalcul): ResultatCalcul | ErreurCalcul {
  const avertissements: string[] = [];
  const lignes: LigneResultat[] = [];

  const dateCalcul = entree.dateCalcul ?? new Date().toISOString().slice(0, 10);
  const anneeImmatriculation = new Date(entree.dateMiseEnCirculation).getFullYear();
  if (Number.isNaN(anneeImmatriculation)) {
    return { ok: false, erreur: `Date de mise en circulation invalide : "${entree.dateMiseEnCirculation}"` };
  }

  // --- Y1 : taxe régionale (cheval fiscal) ---
  const tarifRegional = getTarifRegional(entree.departement);
  if (!tarifRegional) {
    return {
      ok: false,
      erreur: `Tarif régional du cheval fiscal non connu pour le département "${entree.departement}". ` +
        `Seul le département 06 (Alpes-Maritimes) est confirmé à ce jour. ` +
        `Merci de vérifier le tarif officiel de la région pour ce département avant de poursuivre.`,
    };
  }
  const ageMoisPourY1 = moisEntreDates(entree.dateMiseEnCirculation, dateCalcul);
  const decoteY1 = ageMoisPourY1 > 120 ? 0.5 : 1.0; // règle générale : décote régionale de 50% au-delà de 10 ans
  const montantY1 = Math.round(entree.cvFiscaux * tarifRegional.tarif * decoteY1 * 100) / 100;
  lignes.push({
    code: "Y1",
    libelle: "Taxe régionale (cheval fiscal)",
    montant: montantY1,
    confiance: tarifRegional.confiance,
    detail: `${entree.cvFiscaux} CV × ${tarifRegional.tarif.toFixed(2)} €/CV${decoteY1 < 1 ? " × 50% (véhicule >10 ans)" : ""}`,
  });

  // --- Y3 : malus CO2 (+ poids, si applicable) ---
  let montantY3 = 0;
  let confianceY3: Confiance = "confirme";
  const detailsY3: string[] = [];

  if (entree.electriqueOuHydrogene) {
    detailsY3.push("Véhicule électrique/hydrogène : exonéré de malus CO2");
  } else {
    const malusBrut = getMalusCO2Brut(anneeImmatriculation, entree.co2GKm);
    if (!malusBrut) {
      return {
        ok: false,
        erreur:
          `Barème malus CO2 non disponible pour l'année de première immatriculation ${anneeImmatriculation}. ` +
          `Seule l'année 2018 est documentée à ce jour dans ce moteur de calcul. ` +
          `Il faut compléter /copilote-app/lib/bareme-data.ts avant de pouvoir traiter ce cas — ` +
          `ne pas deviner un montant.`,
      };
    }
    const isImport = true; // ce moteur traite uniquement le cas "import d'un véhicule d'occasion"
    let malusApresDecote = malusBrut.montant;
    confianceY3 = malusBrut.confiance;
    if (isImport) {
      const ageMoisPourMalus = moisEntreDates(entree.dateMiseEnCirculation, dateCalcul);
      const { decote, confiance: confianceDecote } = getCoefficientDecote(ageMoisPourMalus);
      malusApresDecote = Math.round(malusBrut.montant * (1 - decote) * 100) / 100;
      detailsY3.push(
        `Malus brut barème ${anneeImmatriculation} @ ${entree.co2GKm}g/km = ${malusBrut.montant.toFixed(2)}€, ` +
          `décote d'âge (${ageMoisPourMalus} mois) = ${(decote * 100).toFixed(0)}%`
      );
      confianceY3 = confianceDecote === "estime" || confianceY3 === "estime" ? "estime" : confianceDecote;
      if (ageMoisPourMalus >= 181) {
        detailsY3.push("Véhicule de plus de 181 mois (15 ans) : exonération totale");
        malusApresDecote = 0;
      }
    }
    montantY3 = malusApresDecote;

    // Malus poids : uniquement si 1ère immatriculation à partir du 1er janvier 2022.
    const dateIntroPoids = new Date(MALUS_POIDS_INTRODUIT_LE);
    if (new Date(entree.dateMiseEnCirculation) >= dateIntroPoids) {
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
    libelle: "Malus CO2" + (entree.poidsKg ? " et poids (TMOM)" : ""),
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
        "pas sur un texte légal primaire consulté directement. Ce total est une estimation motivée, " +
        "pas une garantie au centime près. Voir docs/recherche-malus-carte-grise.md pour l'historique."
    );
  }

  return { ok: true, lignes, total, avertissements };
}

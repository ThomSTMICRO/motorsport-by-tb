/**
 * Données de barème malus écologique / carte grise — France.
 *
 * PRINCIPE DU PROJET : TRANSPARENCE > FAUSSE PRÉCISION, DONNÉES RÉELLES > DONNÉES INVENTÉES.
 * Chaque table ci-dessous porte un niveau de confiance explicite. Le moteur de calcul
 * (voir calculateur.js) DOIT refuser de répondre — plutôt que d'inventer un chiffre —
 * quand une donnée nécessaire n'est pas dans ces tables.
 *
 * Voir /docs/recherche-malus-carte-grise.md à la racine du dépôt pour l'historique complet
 * de la recherche et les sources.
 */

/**
 * Barème malus CO2 par année de première immatriculation.
 * Seule l'année 2018 est documentée avec un niveau de confiance correct à ce jour
 * (sources secondaires concordantes + un point recoupé avec un cas réel payé).
 * Les autres années ne sont PAS encore renseignées — ne pas inventer de valeurs.
 */
const BAREME_CO2_PAR_ANNEE = {
  2018: {
    confiance: "estime", // sources secondaires (L'Argus, cartegrise.com) + 1 point recoupé avec un cas réel (162g/km = 4460€)
    seuil: 120, // g/km à partir duquel le malus s'applique (0€ en dessous)
    plafondCo2: 185,
    plafondMontant: 10500,
    grille: [
      { co2: 119, montant: 0 },
      { co2: 120, montant: 50 },
      { co2: 121, montant: 53 },
      { co2: 122, montant: 60 },
      { co2: 123, montant: 73 },
      { co2: 124, montant: 90 },
      { co2: 125, montant: 113 },
      { co2: 126, montant: 140 },
      { co2: 127, montant: 173 },
      { co2: 128, montant: 210 },
      { co2: 129, montant: 253 },
      { co2: 130, montant: 300 },
      { co2: 131, montant: 353 },
      { co2: 132, montant: 410 },
      { co2: 133, montant: 473 },
      { co2: 134, montant: 540 },
      { co2: 135, montant: 613 },
      { co2: 136, montant: 690 },
      { co2: 137, montant: 773 },
      { co2: 138, montant: 860 },
      { co2: 139, montant: 953 },
      { co2: 140, montant: 1050 },
      { co2: 141, montant: 1153 },
      { co2: 142, montant: 1260 },
      { co2: 143, montant: 1373 },
      { co2: 144, montant: 1490 },
      { co2: 145, montant: 1613 },
      { co2: 146, montant: 1740 },
      { co2: 147, montant: 1873 },
      { co2: 148, montant: 2010 },
      { co2: 149, montant: 2153 },
      // 150-153 : non collecté (trou dans la grille) — interpolé si nécessaire, confiance dégradée
      { co2: 154, montant: 2940 },
      { co2: 155, montant: 3113 },
      { co2: 156, montant: 3290 },
      { co2: 157, montant: 3473 },
      { co2: 158, montant: 3660 },
      { co2: 159, montant: 3853 },
      { co2: 160, montant: 4050 },
      { co2: 161, montant: 4253 },
      { co2: 162, montant: 4460 }, // ✅ recoupé avec un cas réel payé (2786,76€ total)
      { co2: 163, montant: 4673 },
      { co2: 185, montant: 10500 },
    ],
  },
};

/**
 * Coefficient forfaitaire de décote par tranche d'ancienneté du véhicule (en mois,
 * comptés de façon glissante et arrondis à l'unité supérieure — tout mois entamé
 * compte comme un mois complet).
 *
 * ✅ SOURCE PRIMAIRE CONFIRMÉE (12/09/2026) : BOFiP, BOI-AIS-MOB-10-20-40
 * (version du 28/05/2025), section "Détermination du coefficient forfaitaire de
 * décote" — CIBS art. L. 421-7-2, issu de l'article 29 de la loi n° 2025-127 du
 * 14 février 2025 de finances pour 2025, en vigueur depuis le 1er mars 2025
 * (remplace l'ancien système de réduction proportionnelle de 10 %/an).
 *
 * C'est un barème PAR PALIER (pas une courbe continue) : chaque tranche a un
 * pourcentage fixe, aucune interpolation à faire.
 *
 * Vérifié à la fois par le texte de loi ET par un cas réel payé (Audi Q5 2018,
 * 162g/km, 15CV, dépt 06 : 99 mois → tranche 97-108 → 58 %, exactement confirmé
 * par la facture réelle de 2 786,76 €).
 */
const TRANCHES_DECOTE_MOIS = [
  { min: 0, max: 0, decote: 0.0 },
  { min: 1, max: 3, decote: 0.03 },
  { min: 4, max: 6, decote: 0.06 },
  { min: 7, max: 9, decote: 0.09 },
  { min: 10, max: 12, decote: 0.12 },
  { min: 13, max: 18, decote: 0.16 },
  { min: 19, max: 24, decote: 0.2 },
  { min: 25, max: 36, decote: 0.28 },
  { min: 37, max: 48, decote: 0.33 },
  { min: 49, max: 60, decote: 0.38 },
  { min: 61, max: 72, decote: 0.43 },
  { min: 73, max: 84, decote: 0.48 },
  { min: 85, max: 96, decote: 0.53 },
  { min: 97, max: 108, decote: 0.58 }, // ✅ tranche du cas réel Q5 (99 mois)
  { min: 109, max: 120, decote: 0.64 },
  { min: 121, max: 132, decote: 0.7 },
  { min: 133, max: 144, decote: 0.76 },
  { min: 145, max: 156, decote: 0.82 },
  { min: 157, max: 168, decote: 0.88 },
  { min: 169, max: 180, decote: 0.94 },
  { min: 181, max: Infinity, decote: 1.0 }, // exonération totale
];

/**
 * Malus au poids (masse en ordre de marche / TMOM).
 * N'existe QUE pour les véhicules dont la première immatriculation est à partir du
 * 1er janvier 2022 (CIBS art. L.421-72 à L.421-75, confirmé BOFiP BOI-AIS-MOB-10-20-40).
 * Pour un véhicule immatriculé avant, aucune composante poids ne s'applique, quel que
 * soit son poids réel.
 *
 * ⚠️ PAS ENCORE IMPLÉMENTÉ (voir docs/recherche-malus-carte-grise.md, section
 * "Malus poids / TMOM"). Ce n'est PAS un tarif fixe par kg : c'est un barème PAR
 * TRANCHES MARGINALES (comme l'impôt sur le revenu) — chaque tranche de poids a son
 * propre tarif, sommés. Ex. confirmé (barème 2024) : 0-1599kg à 0€/kg, 1600-1799kg à
 * 10€/kg, 1800-1899kg à 15€/kg (tranches au-delà non connues). S'y ajoutent : la même
 * décote par ancienneté que le malus CO2, et un plafonnement pour que
 * (malus CO2 + malus masse) ne dépasse jamais le tarif max du barème CO2 de l'année.
 * Ne pas implémenter tant que la grille complète (toutes tranches) n'est pas obtenue —
 * une implémentation partielle donnerait un chiffre faux avec une fausse assurance.
 */
const MALUS_POIDS_INTRODUIT_LE = "2022-01-01";

/**
 * Tarif du cheval fiscal par région, année 2026 (taxe régionale Y1).
 * ⚠️ Confiance "estime" pour toutes les régions SAUF PACA (département 06, confirmé
 * par un cas réel payé) — sources secondaires concordantes (plusieurs agrégateurs
 * carte grise), mais direct-carte-grise.fr et caroom.fr eux-mêmes sont bloqués par
 * Cloudflare, donc ces valeurs viennent des extraits de recherche, pas d'une page
 * consultée intégralement. Chaque région fixe son tarif annuellement — à revérifier
 * si l'année change.
 */
const TARIF_PAR_REGION_2026 = {
  "Auvergne-Rhône-Alpes": { tarif: 43.0, confiance: "estime" },
  "Bourgogne-Franche-Comté": { tarif: 60.0, confiance: "estime" },
  Bretagne: { tarif: 60.0, confiance: "estime" },
  "Centre-Val de Loire": { tarif: 60.0, confiance: "estime" },
  Corse: { tarif: 53.0, confiance: "estime" },
  "Grand Est": { tarif: 60.0, confiance: "estime" },
  "Hauts-de-France": { tarif: 43.0, confiance: "estime" },
  "Île-de-France": { tarif: 68.95, confiance: "estime" },
  Normandie: { tarif: 60.0, confiance: "estime" },
  "Nouvelle-Aquitaine": { tarif: 58.0, confiance: "estime" },
  Occitanie: { tarif: 59.5, confiance: "estime" },
  "Pays de la Loire": { tarif: 60.0, confiance: "estime" },
  "Provence-Alpes-Côte d'Azur": { tarif: 60.0, confiance: "confirme" }, // dépt 06 confirmé par un cas réel payé
  Martinique: { tarif: 30.0, confiance: "estime" },
  Mayotte: { tarif: 30.0, confiance: "estime" },
};

/**
 * Département (code à 2 chiffres, ou 2A/2B pour la Corse) -> région. Géographie
 * administrative française standard (13 régions métropolitaines depuis 2016 + Corse
 * + DOM), pas une donnée fiscale à vérifier séparément.
 * Guadeloupe (971), Guyane (973), Réunion (974) : tarif non recherché, absents ici
 * plutôt que devinés.
 */
const REGION_PAR_DEPARTEMENT = {
  "01": "Auvergne-Rhône-Alpes", "03": "Auvergne-Rhône-Alpes", "07": "Auvergne-Rhône-Alpes",
  "15": "Auvergne-Rhône-Alpes", "26": "Auvergne-Rhône-Alpes", "38": "Auvergne-Rhône-Alpes",
  "42": "Auvergne-Rhône-Alpes", "43": "Auvergne-Rhône-Alpes", "63": "Auvergne-Rhône-Alpes",
  "69": "Auvergne-Rhône-Alpes", "73": "Auvergne-Rhône-Alpes", "74": "Auvergne-Rhône-Alpes",
  "21": "Bourgogne-Franche-Comté", "25": "Bourgogne-Franche-Comté", "39": "Bourgogne-Franche-Comté",
  "58": "Bourgogne-Franche-Comté", "70": "Bourgogne-Franche-Comté", "71": "Bourgogne-Franche-Comté",
  "89": "Bourgogne-Franche-Comté", "90": "Bourgogne-Franche-Comté",
  "22": "Bretagne", "29": "Bretagne", "35": "Bretagne", "56": "Bretagne",
  "18": "Centre-Val de Loire", "28": "Centre-Val de Loire", "36": "Centre-Val de Loire",
  "37": "Centre-Val de Loire", "41": "Centre-Val de Loire", "45": "Centre-Val de Loire",
  "2A": "Corse", "2B": "Corse",
  "08": "Grand Est", "10": "Grand Est", "51": "Grand Est", "52": "Grand Est",
  "54": "Grand Est", "55": "Grand Est", "57": "Grand Est", "67": "Grand Est",
  "68": "Grand Est", "88": "Grand Est",
  "02": "Hauts-de-France", "59": "Hauts-de-France", "60": "Hauts-de-France",
  "62": "Hauts-de-France", "80": "Hauts-de-France",
  "75": "Île-de-France", "77": "Île-de-France", "78": "Île-de-France", "91": "Île-de-France",
  "92": "Île-de-France", "93": "Île-de-France", "94": "Île-de-France", "95": "Île-de-France",
  "14": "Normandie", "27": "Normandie", "50": "Normandie", "61": "Normandie", "76": "Normandie",
  "16": "Nouvelle-Aquitaine", "17": "Nouvelle-Aquitaine", "19": "Nouvelle-Aquitaine",
  "23": "Nouvelle-Aquitaine", "24": "Nouvelle-Aquitaine", "33": "Nouvelle-Aquitaine",
  "40": "Nouvelle-Aquitaine", "47": "Nouvelle-Aquitaine", "64": "Nouvelle-Aquitaine",
  "79": "Nouvelle-Aquitaine", "86": "Nouvelle-Aquitaine", "87": "Nouvelle-Aquitaine",
  "09": "Occitanie", "11": "Occitanie", "12": "Occitanie", "30": "Occitanie",
  "31": "Occitanie", "32": "Occitanie", "34": "Occitanie", "46": "Occitanie",
  "48": "Occitanie", "65": "Occitanie", "66": "Occitanie", "81": "Occitanie", "82": "Occitanie",
  "44": "Pays de la Loire", "49": "Pays de la Loire", "53": "Pays de la Loire",
  "72": "Pays de la Loire", "85": "Pays de la Loire",
  "04": "Provence-Alpes-Côte d'Azur", "05": "Provence-Alpes-Côte d'Azur",
  "06": "Provence-Alpes-Côte d'Azur", "13": "Provence-Alpes-Côte d'Azur",
  "83": "Provence-Alpes-Côte d'Azur", "84": "Provence-Alpes-Côte d'Azur",
  "972": "Martinique", "976": "Mayotte",
};

/** Tarif du cheval fiscal par département, dérivé de REGION_PAR_DEPARTEMENT +
 *  TARIF_PAR_REGION_2026. Département 06 seul en confiance "confirme". */
const TARIF_CV_PAR_DEPARTEMENT_2026 = Object.fromEntries(
  Object.entries(REGION_PAR_DEPARTEMENT).map(([dept, region]) => [dept, TARIF_PAR_REGION_2026[region]])
);

/** Frais fixes de dossier (Y4 + Y5), indépendants du véhicule. */
const FRAIS_FIXES = {
  y4: 11.0,
  y5: 2.76,
  confiance: "confirme", // confirmé par un cas réel payé
};

/**
 * Le simulateur officiel de service-public.gouv.fr refuse de traiter l'import d'un
 * véhicule d'occasion dont la première immatriculation remonte à plus d'environ 1 à 3 ans
 * (message "Cette situation n'est pas traitée dans ce simulateur pour le moment").
 * Documenté ici pour mémoire — n'affecte pas ce moteur de calcul (qui ne dépend pas
 * du simulateur officiel), mais explique pourquoi on ne peut pas simplement vérifier
 * chaque résultat contre lui pour les véhicules de plus de quelques années.
 */
const LIMITE_SIMULATEUR_OFFICIEL_MOIS = 13; // dernière valeur confirmée fonctionnelle ; 39 mois confirmé refusé

module.exports = {
  BAREME_CO2_PAR_ANNEE,
  TRANCHES_DECOTE_MOIS,
  MALUS_POIDS_INTRODUIT_LE,
  TARIF_CV_PAR_DEPARTEMENT_2026,
  FRAIS_FIXES,
  LIMITE_SIMULATEUR_OFFICIEL_MOIS,
};

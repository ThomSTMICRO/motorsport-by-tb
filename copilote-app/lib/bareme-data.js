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
 *
 * ✅ SOURCE PRIMAIRE CONFIRMÉE (13/09/2026) : API interne du simulateur officiel
 * service-public.gouv.fr (endpoint POST /Default/source, source=3, paramètres
 * annee/minCO2/maxCO2/paramPeriode=1 — voir docs/recherche-malus-carte-grise.md
 * pour le détail de la découverte). Chaque grille ci-dessous a été interrogée
 * point par point directement sur cette API, avec le pas indiqué.
 *
 * ⚠️ Résolution actuelle : tous les 5 g/km, de 100 à 220 g/km inclus. En dehors
 * de cette plage (< 100 ou > 220 g/km) et pour les années non listées ici,
 * AUCUNE valeur n'est disponible — le moteur de calcul doit renvoyer une erreur
 * explicite plutôt que d'interpoler ou d'inventer.
 * Années confirmées : 2012, 2015, 2018, 2020, 2022, 2024, 2026.
 * Années encore manquantes (barème demandé 2012-2026, non couvertes) :
 * 2013, 2014, 2016, 2017, 2019, 2021, 2023, 2025.
 *
 * plafondMontant : uniquement renseigné quand la grille atteint effectivement
 * un plateau DANS la plage 100-220 g/km échantillonnée (confirmé par les points
 * eux-mêmes). Pour 2022, le plafond réel (documenté ailleurs à 40 000 €) n'est
 * PAS encore atteint à 220 g/km dans ce sweep (36 447 € et toujours croissant) :
 * son plafondMontant est donc volontairement omis ici tant qu'il n'est pas
 * confirmé par une requête au-delà de 220 g/km.
 */
const BAREME_CO2_PAR_ANNEE = {
  2012: {
    confiance: "confirme",
    plafondMontant: 2300, // plateau confirmé dès 195 g/km
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 0 },
      { co2: 115, montant: 0 }, { co2: 120, montant: 0 }, { co2: 125, montant: 0 },
      { co2: 130, montant: 0 }, { co2: 135, montant: 0 }, { co2: 140, montant: 0 },
      { co2: 145, montant: 200 }, { co2: 150, montant: 200 }, { co2: 155, montant: 500 },
      { co2: 160, montant: 750 }, { co2: 165, montant: 750 }, { co2: 170, montant: 750 },
      { co2: 175, montant: 750 }, { co2: 180, montant: 750 }, { co2: 185, montant: 1300 },
      { co2: 190, montant: 1300 }, { co2: 195, montant: 2300 }, { co2: 200, montant: 2300 },
      { co2: 205, montant: 2300 }, { co2: 210, montant: 2300 }, { co2: 215, montant: 2300 },
      { co2: 220, montant: 2300 },
    ],
  },
  2015: {
    confiance: "confirme",
    plafondMontant: 8000, // plateau confirmé dès 205 g/km
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 0 },
      { co2: 115, montant: 0 }, { co2: 120, montant: 0 }, { co2: 125, montant: 0 },
      { co2: 130, montant: 0 }, { co2: 135, montant: 150 }, { co2: 140, montant: 250 },
      { co2: 145, montant: 500 }, { co2: 150, montant: 900 }, { co2: 155, montant: 1600 },
      { co2: 160, montant: 2200 }, { co2: 165, montant: 2200 }, { co2: 170, montant: 2200 },
      { co2: 175, montant: 2200 }, { co2: 180, montant: 3000 }, { co2: 185, montant: 3600 },
      { co2: 190, montant: 4000 }, { co2: 195, montant: 6500 }, { co2: 200, montant: 6500 },
      { co2: 205, montant: 8000 }, { co2: 210, montant: 8000 }, { co2: 215, montant: 8000 },
      { co2: 220, montant: 8000 },
    ],
  },
  2018: {
    confiance: "confirme", // upgradé depuis "estime" : recoupé exactement avec l'API officielle ET le cas réel payé (162g/km = 4460€)
    plafondMontant: 10500, // plateau confirmé dès 185 g/km
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 0 },
      { co2: 115, montant: 0 }, { co2: 120, montant: 50 }, { co2: 125, montant: 113 },
      { co2: 130, montant: 300 }, { co2: 135, montant: 613 }, { co2: 140, montant: 1050 },
      { co2: 145, montant: 1613 }, { co2: 150, montant: 2300 }, { co2: 155, montant: 3113 },
      { co2: 160, montant: 4050 }, { co2: 162, montant: 4460 }, // ✅ point exact recoupé avec le cas réel payé (2786,76€ total)
      { co2: 165, montant: 5113 }, { co2: 170, montant: 6300 },
      { co2: 175, montant: 7613 }, { co2: 180, montant: 9050 }, { co2: 185, montant: 10500 },
      { co2: 190, montant: 10500 }, { co2: 195, montant: 10500 }, { co2: 200, montant: 10500 },
      { co2: 205, montant: 10500 }, { co2: 210, montant: 10500 }, { co2: 215, montant: 10500 },
      { co2: 220, montant: 10500 },
    ],
  },
  2020: {
    confiance: "confirme",
    plafondMontant: 20000, // plateau confirmé dès 185 g/km
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 50 },
      { co2: 115, montant: 170 }, { co2: 120, montant: 260 }, { co2: 125, montant: 400 },
      { co2: 130, montant: 818 }, { co2: 135, montant: 1276 }, { co2: 140, montant: 1901 },
      { co2: 145, montant: 2726 }, { co2: 150, montant: 3784 }, { co2: 155, montant: 5105 },
      { co2: 160, montant: 6724 }, { co2: 165, montant: 8671 }, { co2: 170, montant: 10980 },
      { co2: 175, montant: 13682 }, { co2: 180, montant: 16810 }, { co2: 185, montant: 20000 },
      { co2: 190, montant: 20000 }, { co2: 195, montant: 20000 }, { co2: 200, montant: 20000 },
      { co2: 205, montant: 20000 }, { co2: 210, montant: 20000 }, { co2: 215, montant: 20000 },
      { co2: 220, montant: 20000 },
    ],
  },
  2022: {
    confiance: "confirme",
    // Plafond réel documenté ailleurs à 40 000 € mais PAS encore atteint à 220 g/km
    // dans ce sweep (toujours croissant) : plafondMontant volontairement omis.
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 0 },
      { co2: 115, montant: 0 }, { co2: 120, montant: 0 }, { co2: 125, montant: 0 },
      { co2: 130, montant: 100 }, { co2: 135, montant: 210 }, { co2: 140, montant: 310 },
      { co2: 145, montant: 540 }, { co2: 150, montant: 983 }, { co2: 155, montant: 1504 },
      { co2: 160, montant: 2205 }, { co2: 165, montant: 3119 }, { co2: 170, montant: 4279 },
      { co2: 175, montant: 5715 }, { co2: 180, montant: 7462 }, { co2: 185, montant: 9550 },
      { co2: 190, montant: 12012 }, { co2: 195, montant: 14881 }, { co2: 200, montant: 18188 },
      { co2: 205, montant: 21966 }, { co2: 210, montant: 26247 }, { co2: 215, montant: 31063 },
      { co2: 220, montant: 36447 },
    ],
  },
  2024: {
    confiance: "confirme",
    plafondMontant: 60000, // plateau confirmé dès 195 g/km
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 0 },
      { co2: 115, montant: 0 }, { co2: 120, montant: 100 }, { co2: 125, montant: 210 },
      { co2: 130, montant: 310 }, { co2: 135, montant: 540 }, { co2: 140, montant: 983 },
      { co2: 145, montant: 1504 }, { co2: 150, montant: 2205 }, { co2: 155, montant: 3119 },
      { co2: 160, montant: 4279 }, { co2: 165, montant: 5715 }, { co2: 170, montant: 8770 },
      { co2: 175, montant: 14325 }, { co2: 180, montant: 22380 }, { co2: 185, montant: 32935 },
      { co2: 190, montant: 45990 }, { co2: 195, montant: 60000 }, { co2: 200, montant: 60000 },
      { co2: 205, montant: 60000 }, { co2: 210, montant: 60000 }, { co2: 215, montant: 60000 },
      { co2: 220, montant: 60000 },
    ],
  },
  2026: {
    confiance: "confirme",
    plafondMontant: 80000, // plateau confirmé dès 195 g/km
    grille: [
      { co2: 100, montant: 0 }, { co2: 105, montant: 0 }, { co2: 110, montant: 100 },
      { co2: 115, montant: 210 }, { co2: 120, montant: 310 }, { co2: 125, montant: 540 },
      { co2: 130, montant: 983 }, { co2: 135, montant: 1504 }, { co2: 140, montant: 2205 },
      { co2: 145, montant: 3119 }, { co2: 150, montant: 4279 }, { co2: 155, montant: 5715 },
      { co2: 160, montant: 8770 }, { co2: 165, montant: 14325 }, { co2: 170, montant: 22380 },
      { co2: 175, montant: 32935 }, { co2: 180, montant: 45990 }, { co2: 185, montant: 61245 },
      { co2: 190, montant: 76800 }, { co2: 195, montant: 80000 }, { co2: 200, montant: 80000 },
      { co2: 205, montant: 80000 }, { co2: 210, montant: 80000 }, { co2: 215, montant: 80000 },
      { co2: 220, montant: 80000 },
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
 * ✅ SOURCE PRIMAIRE CONFIRMÉE (13/09/2026) : même API officielle que le malus CO2
 * (endpoint POST /Default/source, source=13, paramètres poids/annee). C'est un
 * barème PAR TRANCHES MARGINALES (comme l'impôt sur le revenu) : chaque tranche de
 * poids au-delà de `debutKg` a son propre tarif au kg (`prixParKg`), et le montant
 * dû dans une tranche s'ajoute à ce qui a déjà été accumulé dans les tranches
 * inférieures (`baseAvant`).
 *
 * Formule de calcul pour un poids donné dans une tranche [debutKg, finKg] :
 *   montant = baseAvant + (poids - debutKg) × prixParKg
 *
 * Vérifiée : les valeurs `baseAvant` de chaque tranche sont exactement cohérentes
 * avec l'accumulation des tranches précédentes (ex. 2024 : tranche 1800-1899 à
 * 15€/kg avec baseAvant=2000 = 200kg (1600-1799) × 10€/kg — recoupement interne
 * automatique, aucune valeur n'a été inventée).
 *
 * ⚠️ Plage testée : 1400 à 2600 kg par pas de 50 kg, pour les 5 années où le malus
 * poids existe (2022-2026). Au-delà de 2600 kg, la dernière tranche connue continue
 * de s'appliquer sans borne supérieure confirmée (fin=99999 dans la réponse brute de
 * l'API, donc pas de plafond distinct détecté sur le poids seul — seul le plafond
 * global du barème CO2 de l'année s'applique in fine).
 */
const BAREME_POIDS_PAR_ANNEE = {
  2022: {
    confiance: "confirme",
    tranches: [
      { debutKg: 0, finKg: 1799, prixParKg: 0, baseAvant: 0 },
      { debutKg: 1800, finKg: Infinity, prixParKg: 10, baseAvant: 0 },
    ],
  },
  2023: {
    confiance: "confirme", // identique à 2022, confirmé indépendamment
    tranches: [
      { debutKg: 0, finKg: 1799, prixParKg: 0, baseAvant: 0 },
      { debutKg: 1800, finKg: Infinity, prixParKg: 10, baseAvant: 0 },
    ],
  },
  2024: {
    confiance: "confirme",
    tranches: [
      { debutKg: 0, finKg: 1599, prixParKg: 0, baseAvant: 0 },
      { debutKg: 1600, finKg: 1799, prixParKg: 10, baseAvant: 0 },
      { debutKg: 1800, finKg: 1899, prixParKg: 15, baseAvant: 2000 },
      { debutKg: 1900, finKg: 1999, prixParKg: 20, baseAvant: 3500 },
      { debutKg: 2000, finKg: 2099, prixParKg: 25, baseAvant: 5500 },
      { debutKg: 2100, finKg: Infinity, prixParKg: 30, baseAvant: 8000 },
    ],
  },
  2025: {
    confiance: "confirme", // tranches identiques à 2024
    tranches: [
      { debutKg: 0, finKg: 1599, prixParKg: 0, baseAvant: 0 },
      { debutKg: 1600, finKg: 1799, prixParKg: 10, baseAvant: 0 },
      { debutKg: 1800, finKg: 1899, prixParKg: 15, baseAvant: 2000 },
      { debutKg: 1900, finKg: 1999, prixParKg: 20, baseAvant: 3500 },
      { debutKg: 2000, finKg: 2099, prixParKg: 25, baseAvant: 5500 },
      { debutKg: 2100, finKg: Infinity, prixParKg: 30, baseAvant: 8000 },
    ],
  },
  2026: {
    confiance: "confirme", // seuils resserrés (-100kg sur chaque tranche par rapport à 2024/2025)
    tranches: [
      { debutKg: 0, finKg: 1499, prixParKg: 0, baseAvant: 0 },
      { debutKg: 1500, finKg: 1699, prixParKg: 10, baseAvant: 0 },
      { debutKg: 1700, finKg: 1799, prixParKg: 15, baseAvant: 2000 },
      { debutKg: 1800, finKg: 1899, prixParKg: 20, baseAvant: 3500 },
      { debutKg: 1900, finKg: 1999, prixParKg: 25, baseAvant: 5500 },
      { debutKg: 2000, finKg: Infinity, prixParKg: 30, baseAvant: 8000 },
    ],
  },
};

const MALUS_POIDS_INTRODUIT_LE = "2022-01-01";

/**
 * Tarif du cheval fiscal par région, année 2026 (taxe régionale Y1).
 * ✅ Confiance "confirme" pour Île-de-France (11), Auvergne-Rhône-Alpes (84) et PACA
 * (93) : recoupées le 13/09/2026 directement via l'API officielle du simulateur
 * (POST /Default/source, source=1, paramètre paramCodeREgion=<code INSEE région>).
 * PACA était déjà confirmée séparément par un cas réel payé (département 06).
 * Les autres régions restent en confiance "estime" (sources secondaires
 * concordantes uniquement, direct-carte-grise.fr et caroom.fr étant bloqués par
 * Cloudflare) — à confirmer une par une via la même API quand nécessaire.
 * ⚠️ Le code régional 32 (Hauts-de-France) a été interrogé mais a renvoyé une
 * réponse vide ([]) sans le paramètre `annee` — non résolu, voir docs.
 */
const TARIF_PAR_REGION_2026 = {
  "Auvergne-Rhône-Alpes": { tarif: 43.0, confiance: "confirme" }, // code INSEE 84, recoupé API officielle
  "Bourgogne-Franche-Comté": { tarif: 60.0, confiance: "estime" },
  Bretagne: { tarif: 60.0, confiance: "estime" },
  "Centre-Val de Loire": { tarif: 60.0, confiance: "estime" },
  Corse: { tarif: 53.0, confiance: "estime" },
  "Grand Est": { tarif: 60.0, confiance: "estime" },
  "Hauts-de-France": { tarif: 43.0, confiance: "estime" }, // code INSEE 32, non recoupé (réponse API vide)
  "Île-de-France": { tarif: 68.95, confiance: "confirme" }, // code INSEE 11, recoupé API officielle
  Normandie: { tarif: 60.0, confiance: "estime" },
  "Nouvelle-Aquitaine": { tarif: 58.0, confiance: "estime" },
  Occitanie: { tarif: 59.5, confiance: "estime" },
  "Pays de la Loire": { tarif: 60.0, confiance: "estime" },
  "Provence-Alpes-Côte d'Azur": { tarif: 60.0, confiance: "confirme" }, // code INSEE 93, recoupé API officielle + cas réel dépt 06
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
 *  TARIF_PAR_REGION_2026. Départements des régions Île-de-France, Auvergne-Rhône-Alpes
 *  et PACA en confiance "confirme" ; les autres en "estime" (voir TARIF_PAR_REGION_2026). */
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
 * (Cette limite ne s'applique PAS à l'API /Default/source utilisée pour extraire les
 * barèmes ci-dessus : celle-ci interroge les tables de données brutes directement,
 * sans passer par la logique de validation du parcours utilisateur.)
 */
const LIMITE_SIMULATEUR_OFFICIEL_MOIS = 13; // dernière valeur confirmée fonctionnelle ; 39 mois confirmé refusé

module.exports = {
  BAREME_CO2_PAR_ANNEE,
  BAREME_POIDS_PAR_ANNEE,
  TRANCHES_DECOTE_MOIS,
  MALUS_POIDS_INTRODUIT_LE,
  TARIF_CV_PAR_DEPARTEMENT_2026,
  FRAIS_FIXES,
  LIMITE_SIMULATEUR_OFFICIEL_MOIS,
};

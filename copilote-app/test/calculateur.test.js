const test = require("node:test");
const assert = require("node:assert/strict");
const { calculerCoutImport, moisEntreDates, getCoefficientDecote } = require("../lib/calculateur");

test("moisEntreDates reproduit l'exemple BOFiP #1 : 13/02/2023 -> 10/04/2025 = 26 mois", () => {
  assert.equal(moisEntreDates("2023-02-13", "2025-04-10"), 26);
});

test("moisEntreDates reproduit l'exemple BOFiP #2 : 13/02/2019 -> 01/03/2025 = 73 mois", () => {
  assert.equal(moisEntreDates("2019-02-13", "2025-03-01"), 73);
});

test("getCoefficientDecote applique la bonne tranche BOFiP (pas d'interpolation)", () => {
  assert.equal(getCoefficientDecote(26).decote, 0.28); // tranche 25-36
  assert.equal(getCoefficientDecote(73).decote, 0.48); // tranche 73-84
  assert.equal(getCoefficientDecote(99).decote, 0.58); // tranche 97-108 — cas réel Q5
  assert.equal(getCoefficientDecote(0).decote, 0);
  assert.equal(getCoefficientDecote(181).decote, 1.0);
  assert.equal(getCoefficientDecote(500).decote, 1.0); // au-delà de la table
});

test("CAS RÉEL DE CALIBRATION : Audi Q5 2018, 162g/km, 15CV, dépt 06 -> 2786,76€ payés", () => {
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 15,
    co2GKm: 162,
    dateMiseEnCirculation: "2018-06-13",
    dateCalcul: "2026-09-12",
  });
  assert.equal(resultat.ok, true);

  const ageMois = moisEntreDates("2018-06-13", "2026-09-12");
  assert.equal(ageMois, 99, "l'âge du véhicule dans ce scénario doit être de 99 mois");

  const y1 = resultat.lignes.find((l) => l.code === "Y1");
  const y3 = resultat.lignes.find((l) => l.code === "Y3");
  const y4 = resultat.lignes.find((l) => l.code === "Y4");
  const y5 = resultat.lignes.find((l) => l.code === "Y5");

  assert.equal(y1.montant, 900, "Y1 = 15 CV x 60€/CV = 900€, confirmé");
  // Y3 gardé avec centimes (1873,20€), pas arrondi individuellement — voir cas réel #2
  // ci-dessous qui a révélé que seul le SOUS-TOTAL Y1+Y2+Y3+Y4 est arrondi, pas Y3 seul.
  assert.equal(y3.montant, 1873.2, "Y3 = 4460€ x 42% = 1873,20€, non arrondi individuellement");
  assert.equal(y4.montant, 11);
  assert.equal(y5.montant, 2.76);
  assert.equal(resultat.total, 2786.76, "le total doit correspondre exactement au montant réellement payé");
});

test("CAS RÉEL DE CALIBRATION #2 (simulateur officiel, 13/09/2026) : véhicule 2019, dépt 38, anniversaire exact", () => {
  // Isère (dépt 38, région Auvergne-Rhône-Alpes, 43€/CV), 32 CV, essence, 170g/km CO2,
  // 1ère immatriculation le 13/09/2019, calcul fait le 13/09/2026 (EXACTEMENT 7 ans
  // jour pour jour). Capture d'écran du simulateur officiel service-public.gouv.fr :
  // Y1 = 1 376,00€, Y3 (malus CO2 et TMOM) = 2 298,30€ (TMOM = 0€ car véhicule pré-2022),
  // Y4 = 11,00€, sous-total = 3 685,00€, Y5 = 2,76€, total = 3 687,76€.
  // Ce cas a permis de découvrir que le simulateur officiel entame un mois
  // supplémentaire sur une date anniversaire EXACTE (voir moisEntreDates).
  const resultat = calculerCoutImport({
    departement: "38",
    cvFiscaux: 32,
    co2GKm: 170,
    dateMiseEnCirculation: "2019-09-13",
    dateCalcul: "2026-09-13",
  });
  assert.equal(resultat.ok, true);

  const ageMois = moisEntreDates("2019-09-13", "2026-09-13");
  assert.equal(ageMois, 85, "date anniversaire exacte : 84 mois pleins + 1 mois entamé");

  const y1 = resultat.lignes.find((l) => l.code === "Y1");
  const y3 = resultat.lignes.find((l) => l.code === "Y3");
  assert.equal(y1.montant, 1376, "Y1 = 32 CV x 43€/CV = 1376€, confirmé par le simulateur officiel");
  assert.equal(y3.montant, 2298.3, "Y3 = 4890€ (2019 @170g/km) x 47% retenu = 2298,30€ exactement, non arrondi individuellement, confirmé");
  assert.equal(resultat.total, 3687.76, "total Y1+Y3+Y4+Y5 arrondi au sous-total = 3 687,76€, confirmé par le simulateur officiel");
});

test("Barème 2018 : sous le seuil de 120g/km, malus nul", () => {
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 6,
    co2GKm: 110,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.lignes.find((l) => l.code === "Y3").montant, 0);
});

test("Véhicule électrique : malus CO2 exonéré quelle que soit l'année", () => {
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 8,
    co2GKm: 0,
    dateMiseEnCirculation: "2020-01-01",
    dateCalcul: "2026-09-12",
    electriqueOuHydrogene: true,
  });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.lignes.find((l) => l.code === "Y3").montant, 0);
});

test("Véhicule de plus de 181 mois : exonération totale du malus", () => {
  // dateCalcul choisie loin dans le futur pour isoler le comportement d'exonération
  // par ancienneté (le barème 2018 est la seule année documentée dans ce moteur).
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 10,
    co2GKm: 180,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2035-01-01",
  });
  // 2018-01-01 -> 2035-01-01 : date anniversaire exacte (même jour du mois), donc un
  // mois supplémentaire est entamé (17 ans = 204 mois pleins + 1, voir moisEntreDates).
  assert.equal(moisEntreDates("2018-01-01", "2035-01-01"), 205);
  assert.equal(resultat.ok, true);
  assert.equal(resultat.lignes.find((l) => l.code === "Y3").montant, 0);
});

test("Année de barème inconnue -> erreur explicite, jamais un chiffre inventé", () => {
  // Le barème 2012-2026 est désormais complet (voir bareme-data.js) : 2010 reste hors
  // de toute grille connue, donc toujours un bon cas de test pour l'erreur explicite.
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2010-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(resultat.ok, false);
  assert.match(resultat.erreur, /2010/);
});

test("Département inconnu -> erreur explicite, jamais un tarif inventé", () => {
  // 971 (Guadeloupe) : volontairement absent de la table (tarif non recherché,
  // jamais deviné) — voir REGION_PAR_DEPARTEMENT dans bareme-data.js.
  const resultat = calculerCoutImport({
    departement: "971",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(resultat.ok, false);
  assert.match(resultat.erreur, /971/);
});

test("Département métropolitain hors 06 : couvert via la table région (Île-de-France et Auvergne-Rhône-Alpes confirmées via l'API officielle)", () => {
  // 75 = Paris (Île-de-France), 69 = Rhône (Auvergne-Rhône-Alpes) : tarifs dérivés
  // de la table région. Confiance "confirme" pour ces deux régions depuis le
  // recoupement direct via l'API officielle (source=1) le 13/09/2026.
  const paris = calculerCoutImport({
    departement: "75",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(paris.ok, true);
  const y1Paris = paris.lignes.find((l) => l.code === "Y1");
  assert.equal(y1Paris.montant, 689.5); // 10 CV x 68,95€/CV = 689,50€, non arrondi individuellement
  assert.equal(y1Paris.confiance, "confirme");

  const lyon = calculerCoutImport({
    departement: "69",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(lyon.ok, true);
  assert.equal(lyon.lignes.find((l) => l.code === "Y1").montant, 430); // 10 CV x 43€/CV
  assert.equal(lyon.lignes.find((l) => l.code === "Y1").confiance, "confirme");
});

test("Malus poids (TMOM) : appliqué pour un véhicule immatriculé après 2022 avec poids fourni", () => {
  // 2024, 2100kg -> tranche 2100+ @ 30€/kg, baseAvant=8000 -> malus poids brut = 8000€.
  // CO2 à 130g/km en 2024 -> malus CO2 brut = 310€. Total brut combiné = 8310€.
  // dateCalcul choisie avant le jour anniversaire (20 < 25) pour obtenir 0 mois entamé
  // sans ambiguïté (voir moisEntreDates : une date anniversaire EXACTE entamerait déjà
  // un mois, confirmé par un cas réel — non désiré ici, on veut isoler le calcul brut).
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 10,
    co2GKm: 130,
    poidsKg: 2100,
    dateMiseEnCirculation: "2024-01-25",
    dateCalcul: "2024-01-20", // 0 mois -> décote 0%
  });
  assert.equal(resultat.ok, true);
  const y3 = resultat.lignes.find((l) => l.code === "Y3");
  assert.equal(y3.montant, 8310);
  assert.match(y3.detail, /malus poids brut/);
});

test("Malus poids (TMOM) : aucune composante poids avant 2022 même avec un poids élevé", () => {
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 15,
    co2GKm: 162,
    poidsKg: 2200, // poids élevé, mais sans effet : véhicule de 2018
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-04-10",
  });
  assert.equal(resultat.ok, true);
  const y3 = resultat.lignes.find((l) => l.code === "Y3");
  assert.equal(y3.montant, 1873.2); // identique au cas réel de calibration : le poids n'a aucun effet
});

test("Malus poids (TMOM) : avertissement clair si poids non fourni pour un véhicule post-2022", () => {
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 10,
    co2GKm: 130,
    dateMiseEnCirculation: "2024-01-01",
    dateCalcul: "2024-06-01",
  });
  assert.equal(resultat.ok, true);
  assert.ok(resultat.avertissements.some((a) => /poids.*non.*fourni|aucun poids/i.test(a)));
});

test("Entrées invalides rejetées proprement", () => {
  assert.equal(calculerCoutImport({}).ok, false);
  assert.equal(calculerCoutImport({ departement: "06", cvFiscaux: -1, co2GKm: 100, dateMiseEnCirculation: "2018-01-01" }).ok, false);
  assert.equal(calculerCoutImport({ departement: "06", cvFiscaux: 10, co2GKm: 100, dateMiseEnCirculation: "pas-une-date" }).ok, false);
});

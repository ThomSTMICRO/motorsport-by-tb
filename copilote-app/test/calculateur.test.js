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
  assert.equal(y3.montant, 1873, "Y3 = 4460€ x 42% = 1873€ arrondi, confirmé par la facture réelle");
  assert.equal(y4.montant, 11);
  assert.equal(y5.montant, 2.76);
  assert.equal(resultat.total, 2786.76, "le total doit correspondre exactement au montant réellement payé");
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
  assert.equal(moisEntreDates("2018-01-01", "2035-01-01"), 204);
  assert.equal(resultat.ok, true);
  assert.equal(resultat.lignes.find((l) => l.code === "Y3").montant, 0);
});

test("Année de barème inconnue -> erreur explicite, jamais un chiffre inventé", () => {
  const resultat = calculerCoutImport({
    departement: "06",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2021-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(resultat.ok, false);
  assert.match(resultat.erreur, /2021/);
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

test("Département métropolitain hors 06 : couvert via la table région (confiance estimée)", () => {
  // 75 = Paris (Île-de-France), 69 = Rhône (Auvergne-Rhône-Alpes) : tarifs dérivés
  // de la table région, confiance "estime" (pas "confirme" comme le 06).
  const paris = calculerCoutImport({
    departement: "75",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(paris.ok, true);
  const y1Paris = paris.lignes.find((l) => l.code === "Y1");
  assert.equal(y1Paris.montant, 690); // 10 CV x 68,95€/CV = 689,5 -> arrondi 690
  assert.equal(y1Paris.confiance, "estime");

  const lyon = calculerCoutImport({
    departement: "69",
    cvFiscaux: 10,
    co2GKm: 150,
    dateMiseEnCirculation: "2018-01-01",
    dateCalcul: "2026-09-12",
  });
  assert.equal(lyon.ok, true);
  assert.equal(lyon.lignes.find((l) => l.code === "Y1").montant, 430); // 10 CV x 43€/CV
});

test("Entrées invalides rejetées proprement", () => {
  assert.equal(calculerCoutImport({}).ok, false);
  assert.equal(calculerCoutImport({ departement: "06", cvFiscaux: -1, co2GKm: 100, dateMiseEnCirculation: "2018-01-01" }).ok, false);
  assert.equal(calculerCoutImport({ departement: "06", cvFiscaux: 10, co2GKm: 100, dateMiseEnCirculation: "pas-une-date" }).ok, false);
});

# Recherche malus écologique / carte grise — données confirmées

> Document de travail pour le futur calculateur "coût d'import véhicule".
> Séparé du site web live — voir note projet : à fusionner plus tard, pas maintenant.
> Principe : TRANSPARENCE > FAUSSE PRÉCISION, DONNÉES RÉELLES > DONNÉES INVENTÉES.
> Chaque donnée ci-dessous est étiquetée par son niveau de confiance.

## Cas réel validé (calibration) — Audi Q5 2018 252ch essence, import Allemagne

Payé réellement par l'utilisateur : **2 786,76 €** (département 06, 15 CV fiscaux, CO2 = 162 g/km).

Décomposition reconstituée et vérifiée :

| Poste | Montant | Confiance |
|---|---|---|
| Y1 — taxe régionale (15 CV × 60,00 €/CV, PACA 2026) | 900,00 € | ✅ Confirmé par l'utilisateur |
| Y3 — malus CO2 (barème 2018 @ 162g/km = 4 460 €, décote appliquée) | 1 873,00 € | ✅ Déduit exactement (reste après Y1+Y4+Y5) |
| Y4 + Y5 — frais fixes | 13,76 € | ✅ Confirmé (valeurs standard : 11,00 € + 2,76 €) |
| **Total** | **2 786,76 €** | ✅ Réel, payé |

**Coefficient de décote réel déduit : 1 873,00 / 4 460,00 = 42,00 % retenu → 58,00 % de décote.**
Âge estimé du véhicule au moment du calcul : ~99 mois (véhicule 2018, calcul fait en 2026).

Ce point réel (99 mois → 58% décote) est le 3e point de calibration confirmé, à ajouter aux deux
points déjà connus. La courbe semble légèrement plus agressive que l'interpolation linéaire
dans cette tranche (55% linéaire vs 58% réel = écart de 3 points).

## Barème malus CO2 — année 2018 (source : agrégateurs auto, non primaire — Légifrance bloqué par Cloudflare)

Seuil de départ : 120 g/km. Montant de base : 50 €. Plafond : 185 g/km = 10 500 € max.

| CO2 (g/km) | Malus 2018 |
|---|---|
| ≤119 | 0 € |
| 120 | 50 € |
| 130 | 300 € |
| 140 | 1 050 € |
| 147 | 1 873 € |
| 149 | 2 153 € |
| 154 | 2 940 € |
| 155 | 3 113 € |
| 156 | 3 290 € |
| 157 | 3 473 € |
| 158 | 3 660 € |
| 159 | 3 853 € |
| 160 | 4 050 € |
| 161 | 4 253 € |
| **162** | **4 460 €** ✅ confirmé par recoupement avec le cas réel ci-dessus |
| 163 | 4 673 € |
| 185+ | 10 500 € (max) |

⚠️ Grille complète 120-185g non entièrement collectée. Sources secondaires concordantes
(L'Argus, cartegrise.com, motor1.fr) mais pas de texte primaire (Légifrance/Journal Officiel)
consulté directement — bloqué par Cloudflare même via navigateur complet.

## Décote par âge (véhicule d'occasion importé) — réforme du 1er mars 2025

✅ **SOURCE PRIMAIRE CONFIRMÉE (12/09/2026)** : BOFiP, [BOI-AIS-MOB-10-20-40](https://bofip.impots.gouv.fr/bofip/13927-PGP.html/identifiant=BOI-AIS-MOB-10-20-40-20250528)
(version du 28/05/2025), section "Détermination du coefficient forfaitaire de décote".
Légifrance lui-même reste bloqué par Cloudflare, mais BOFiP (Bulletin officiel des finances
publiques — la doctrine fiscale de l'administration, qui cite le texte de loi) ne l'est pas et
a pu être consulté intégralement via navigateur complet (GitHub Actions).

Base légale citée : CIBS art. L. 421-7-2, issu de l'article 29 de la loi n° 2025-127 du
14 février 2025 de finances pour 2025, en vigueur depuis le **1er mars 2025**. Remplace l'ancien
système de réduction proportionnelle de 10 %/an (applicable avant cette date).

Principe : l'ancienneté est comptée en mois de façon **glissante**, arrondie à **l'unité
supérieure** (tout mois entamé compte comme un mois complet). C'est un **barème par palier**
(pas une courbe continue) :

| Ancienneté (mois) | Coefficient forfaitaire de décote |
|---|---|
| 1 à 3 | 3% |
| 4 à 6 | 6% |
| 7 à 9 | 9% |
| 10 à 12 | 12% |
| 13 à 18 | 16% |
| 19 à 24 | 20% |
| 25 à 36 | 28% |
| 37 à 48 | 33% |
| 49 à 60 | 38% |
| 61 à 72 | 43% |
| 73 à 84 | 48% |
| 85 à 96 | 53% |
| **97 à 108** | **58%** ✅ tranche exacte du cas réel Q5 (99 mois) |
| 109 à 120 | 64% |
| 121 à 132 | 70% |
| 133 à 144 | 76% |
| 145 à 156 | 82% |
| 157 à 168 | 88% |
| 169 à 180 | 94% |
| À partir de 181 | 100% (exonération totale) |

**Double confirmation** : cette table (texte de loi, indépendant du cas Q5) place 99 mois dans
la tranche 97-108 = 58% — exactement la valeur déduite précédemment de la facture réelle
(2 786,76€). Les deux sources concordent parfaitement, ce n'est plus une estimation.

Le BOFiP donne aussi deux exemples chiffrés qui confirment la règle d'arrondi des mois
("glissant, arrondi à l'unité supérieure") :
- Véhicule immatriculé le 13/02/2023, réimmatriculé en France le 10/04/2025 → 26 mois
  entamés (25 complets + 1 entamé) → tranche 25-36 → 28% de décote. Malus WLTP 2023 brut
  de 7 462€ → 7 462 × 0,72 = 5 372,64€ arrondi à 5 373€.
- Véhicule immatriculé le 13/02/2019, réimmatriculé le 01/03/2025 → 73 mois entamés
  (72 complets + 1 entamé) → tranche 73-84 → 48% de décote. Malus puissance administrative
  2019 de 8 000€ → 8 000 × 0,52 = 4 160€.

Ces deux exemples valident aussi la règle de calcul des mois déjà implémentée dans
`copilote-app/lib/calculateur.ts` (`moisEntreDates`), vérifiée a posteriori : elle reproduit
exactement 26 et 73 mois pour ces deux cas.

## Malus poids / TMOM

**N'existait pas en 2018** — introduit le 1er janvier 2022. Pour un véhicule enregistré avant 2022,
aucune composante poids ne s'applique, quel que soit son poids réel (le barème utilisé est celui
de l'année de 1ère immatriculation, qui ne comportait pas cette taxe).

Pour les véhicules immatriculés à partir de 2022, tranches connues (2026, non vérifiées à 100% —
divergence trouvée entre source simulateur réel et source tierce) :
- 1900-1999 kg : 20 €/kg (donnée simulateur officiel réelle) vs 25 €/kg (source tierce — à
  reconcilier, privilégier la donnée simulateur officiel)

## Taxe régionale (Y1) — tarifs cheval fiscal confirmés

- 2026, département 06 (Alpes-Maritimes, région PACA) : **60,00 €/CV** ✅ confirmé (cas réel + sources concordantes)
- Régions au tarif maximal 60,00 €/CV en 2026 : Bourgogne-Franche-Comté, Bretagne,
  Centre-Val-de-Loire, Grand Est, Normandie, PACA
- Décote régionale par âge du véhicule (règle générale, à confirmer précisément) :
  ×1,0 si <10 ans depuis 1ère immatriculation, ×0,5 si >10 ans — véhicule <10 ans dans le cas
  réel étudié (99 mois = 8,25 ans), donc pas de décote appliquée sur Y1, cohérent avec
  Y1 = 900,00 € confirmé sans réduction.

## Frais fixes

- Y4 = 11,00 €
- Y5 = 2,76 €
- Total fixe = 13,76 € ✅ confirmé (cas réel)

## Limite majeure du simulateur officiel (service-public.gouv.fr)

**Le simulateur officiel refuse de calculer le coût pour l'import d'un véhicule d'occasion dont
la première immatriculation remonte à plus d'environ 1 à 3 ans** (message : "Cette situation n'est
pas traitée dans ce simulateur pour le moment. [...] contactez France Titres (ex-ANTS)").

Testé et confirmé :
- Date 2026 (aujourd'hui) → fonctionne
- Date 2025-08-15 (~13 mois) → fonctionnait (test antérieur du projet)
- Date 2023-06-01 (~39 mois) → refusé
- Date 2018-06-01 (~99 mois) → refusé

**Implication majeure pour le projet** : la plupart des véhicules réellement importés (3-15 ans,
avant exonération totale) ne peuvent PAS être calculés via automatisation du simulateur officiel.
Le calculateur doit reposer sur les grilles de barème publiées par année + la formule de décote,
pas sur le pilotage du simulateur gouvernemental.

## CO2 malus 2026 (barème en vigueur pour les imports très récents)

Sweep partiel réalisé via automatisation Playwright du simulateur officiel — voir historique
du projet pour le détail. Seuil de départ ~108 g/km, montant max 80 000 € à 192g+.
Grille complète non finalisée (problèmes techniques d'automatisation — voir historique).

## Prochaines étapes suggérées

1. ✅ **FAIT (12/09/2026)** : trouvé le texte primaire de la décote via BOFiP (voir section
   ci-dessus) — BOFiP n'est pas bloqué par Cloudflare, contrairement à Légifrance. Bonne piste
   à retenir pour toute future recherche de texte fiscal primaire.
2. Compléter la grille malus CO2 2018 gramme par gramme (actuellement partielle) — via BOFiP,
   qui a d'autres pages avec des exemples chiffrés utilisables comme points de calibration
   (ex. barème WLTP 2023 @175g/km = 7 462€, vu dans un exemple de la page décote).
3. Reconstituer les grilles malus CO2 pour les autres années pertinentes (2019-2027) selon
   la même méthode — BOFiP est la source à privilégier maintenant qu'on sait qu'elle est
   accessible.
4. Reconcilier la divergence poids/TMOM (20€/kg vs 25€/kg pour 1900-1999kg) — probablement
   aussi trouvable sur BOFiP (BOI-AIS-MOB-10-20-40, section sur le malus au poids).
5. Collecter d'autres cas réels pour continuer à valider le moteur de calcul en conditions
   réelles (le cas Q5 a déjà servi à vérifier Y1, Y3, la tranche de décote ET la règle
   d'arrondi des mois).

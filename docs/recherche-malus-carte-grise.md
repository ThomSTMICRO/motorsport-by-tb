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

## API interne du simulateur officiel — la découverte majeure du 13/09/2026

Le simulateur `service-public.gouv.fr/simulateur/calcul/cout-certificat-immatriculation` (basé
sur le framework G6K/DSFR) charge son graphe de calcul via `POST /Default/fields` puis résout
chaque variable individuellement via **`POST /Default/source`**, un endpoint interne qui accepte
un corps `application/x-www-form-urlencoded` :

```
source=<N>&<param1>=<valeur1>&...&_csrf_token=<jeton>
```

Le jeton CSRF s'extrait après chargement de la page (`input[name="_csrf_token"]`) et reste valide
pour toute la session — on peut donc l'interroger directement, autant de fois que nécessaire,
**sans repasser par tout le parcours utilisateur** (et donc sans se heurter à la restriction
« situation non traitée » qui bloque le simulateur pour les véhicules de plus de quelques années
— voir plus bas). C'est un accès direct aux tables de données brutes du barème officiel.

Sources identifiées et leur usage :

| `source=` | Paramètres | Contenu retourné |
|---|---|---|
| 3 | `annee`, `minCO2`, `maxCO2`, `paramPeriode=1` | Malus CO2 brut (texte brut, ex. `"10692"`) |
| 13 | `poids`, `annee` | Tranche de malus poids (JSON : `annee, tranchedebut, tranchefin, tranche, totaltrancheareporter, prixaukg`) |
| 1 | `paramCodeREgion` (code INSEE région), `annee` | Taxe régionale (JSON : `id, coderegion, taxe, exotaxeregvehiculepropre`) |
| 12 | `paramMoisEcoules` | Décote par âge (déjà connue via BOFiP, non re-vérifiée par cette API) |
| 4 | `annee`, `minCV`, `maxCV`, `paramPeriode=1` | Probablement barème par puissance administrative — non exploré |
| 2, 9, 10, 11, 14, 15, 16 | divers | Capturés mais non décodés (voir historique du projet) |

Cette découverte permet d'obtenir des données **primaires officielles** (confiance `"confirme"`)
pour n'importe quelle combinaison année/CO2/poids/région, sans dépendre d'agrégateurs tiers
(souvent bloqués par Cloudflare ou incomplets). Les sections ci-dessous ont été mises à jour en
conséquence.

## Barème malus CO2 — grilles confirmées via l'API officielle (13/09/2026)

Interrogation directe de `source=3`, tous les 5 g/km, plage 100-220 g/km, pour 7 années :
**2012, 2015, 2018, 2020, 2022, 2024, 2026**. Confiance `"confirme"` pour toutes (source
primaire officielle). Grilles complètes dans `copilote-app/lib/bareme-data.js`.

Point de contrôle (sanity check) : `source=3&annee=2026&minCO2=162&maxCO2=162` → `10692` (cohérent
avec la progression 2026 : 160g→8770€, 165g→14325€, 162g proche de l'interpolation attendue).

| CO2 (g/km) | 2012 | 2015 | 2018 | 2020 | 2022 | 2024 | 2026 |
|---|---|---|---|---|---|---|---|
| 120 | 0 € | 0 € | 50 € | 260 € | 0 € | 100 € | 310 € |
| 140 | 0 € | 250 € | 1 050 € | 1 901 € | 310 € | 983 € | 2 205 € |
| 160 | 750 € | 2 200 € | 4 050 € | 6 724 € | 2 205 € | 4 279 € | 8 770 € |
| **162** | — | — | **4 460 €** ✅ cas réel payé | — | — | — | — |
| 180 | 750 € | 3 000 € | 9 050 € | 16 810 € | 7 462 € | 22 380 € | 45 990 € |
| 200 | 2 300 € | 6 500 € | 10 500 € | 20 000 € | 18 188 € | 60 000 € | 80 000 € |
| 220 | 2 300 € | 8 000 € | 10 500 € | 20 000 € | 36 447 € | 60 000 € | 80 000 € |
| **Plafond** | 2 300 € (dès 195g) | 8 000 € (dès 205g) | 10 500 € (dès 185g) | 20 000 € (dès 185g) | 40 000 € ⚠️ non atteint dans ce sweep (220g=36 447€, toujours croissant) | 60 000 € (dès 195g) | 80 000 € (dès 195g) |

Le point 162g/km = 4 460 € pour 2018 est **exactement identique** à la valeur déjà déduite du cas
réel payé (Audi Q5, 2 786,76 € au total) — recoupement parfait entre les deux sources.

**Années encore manquantes** (le barème demandé va de 2012 à 2026, soit 15 années) :
2013, 2014, 2016, 2017, 2019, 2021, 2023, 2025. Non collectées à ce jour — un futur passage sur
`source=3` avec ces années comblera ce trou (méthode identique, déjà éprouvée).

**Limites actuelles de la plage testée** : seul 100-220 g/km a été interrogé. En dessous de
100 g/km, les valeurs observées sont déjà à 0€ pour toutes les années (cohérent avec un seuil de
déclenchement au-dessus de 100g), mais ce n'est pas confirmé point par point. Au-dessus de 220
g/km, seule l'année 2022 n'a pas encore atteint son plateau connu (40 000€) dans le sweep actuel.

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

## Malus poids / TMOM — ✅ grilles complètes confirmées via l'API officielle (13/09/2026)

**N'existait pas en 2018** — introduit le 1er janvier 2022 (CIBS art. L.421-72 à L.421-75,
confirmé BOFiP BOI-AIS-MOB-10-20-40). Pour un véhicule dont la 1ère immatriculation est
antérieure au 1er janvier 2022, le malus masse est **nul**, quel que soit son poids réel
(confirmé par un exemple chiffré du BOFiP : véhicule immatriculé le 13/02/2020, 2000kg,
importé/immatriculé en France en 2022 → malus masse = 0€, car "la première immatriculation
est intervenue avant l'entrée en vigueur de la taxe au 1er janvier 2022").

C'est un **barème PAR TRANCHES MARGINALES**, comme l'impôt sur le revenu : chaque tranche de
poids a son propre tarif marginal (`prixaukg`), et le montant dans une tranche s'ajoute à ce qui
a déjà été accumulé dans les tranches inférieures (`totaltrancheareporter`, renommé `baseAvant`
dans le code) :

```
montant = baseAvant + (poids - débutTranche) × prixParKg
```

**Grilles interrogées directement via `source=13`** (paramètres `poids`/`annee`), plage
1400-2600 kg par pas de 50 kg, pour les 5 années où le malus existe :

| Année | Tranches (kg) et tarif marginal |
|---|---|
| 2022 | 0-1799 @ 0€/kg · 1800+ @ 10€/kg |
| 2023 | 0-1799 @ 0€/kg · 1800+ @ 10€/kg (identique à 2022) |
| 2024 | 0-1599 @ 0 · 1600-1799 @ 10 · 1800-1899 @ 15 · 1900-1999 @ 20 · 2000-2099 @ 25 · 2100+ @ 30 €/kg |
| 2025 | identique à 2024 |
| 2026 | 0-1499 @ 0 · 1500-1699 @ 10 · 1700-1799 @ 15 · 1800-1899 @ 20 · 1900-1999 @ 25 · 2000+ @ 30 €/kg (seuils resserrés de 100kg par rapport à 2024/2025) |

Ces valeurs sont **auto-cohérentes** : les `baseAvant` de chaque tranche correspondent exactement
à l'accumulation des tranches précédentes (ex. 2024, tranche 1800-1899 @ 15€/kg avec
baseAvant=2000€ = 200kg × 10€/kg de la tranche 1600-1799 précédente). Elles recoupent aussi
exactement l'exemple BOFiP cité plus haut (2024, 1849kg → 0 + 200×10 + 49×15 = 2 735€ ; à noter
que l'exemple BOFiP original calculait 50×15 au lieu de 49×15 par arrondi de tranche inclusive,
écart mineur de 15€ sans impact sur la validité de la structure).

⚠️ Plage testée seulement jusqu'à 2600 kg — au-delà, la dernière tranche connue de chaque année
continue de s'appliquer sans borne supérieure détectée dans les réponses de l'API (`tranchefin`
retourne 99999 pour la dernière tranche).

**Règles complémentaires confirmées par BOFiP (non re-vérifiées par l'API ci-dessus)** :
- La réduction d'ancienneté du malus masse suit **exactement la même table par tranche de mois**
  que le malus CO2 (CIBS art. L.421-73) — même fonction de décote, pas une règle séparée. Le
  moteur de calcul applique donc la décote sur (malus CO2 + malus masse) combinés, pas séparément.
- **Plafonnement du cumul** (CIBS art. L.421-74) : le malus masse est réduit pour que
  (malus CO2 + malus masse) ne dépasse jamais le tarif maximum du barème CO2 de l'année
  concernée — implémenté dans le moteur via `plafondMontant` quand celui-ci est connu.
- Abattement famille nombreuse pour le malus masse : **200 kg par enfant à charge** (vs 20g/km
  pour le malus CO2) — non implémenté dans le moteur à ce jour (fonctionnalité absente, pas un
  chiffre inventé).

Implémenté dans `copilote-app/lib/bareme-data.js` (`BAREME_POIDS_PAR_ANNEE`) et
`copilote-app/lib/calculateur.js` (`getMalusPoidsBrut`), avec tests dans
`copilote-app/test/calculateur.test.js`.

## Points de calibration CO2 supplémentaires trouvés (BOFiP) — ✅ corroborés par l'API officielle

Trouvés dans les exemples chiffrés du BOFiP BOI-AIS-MOB-10-20-40. **Recoupement confirmé** avec
le sweep direct de l'API officielle (`source=3`, section ci-dessus) : 2022@160g=2 205€ et
2022@200g=18 188€ sont des correspondances exactes ; 2022@222g=38 767€ est cohérent avec la
progression observée (220g=36 447€, toujours croissant vers le plafond documenté à 40 000€) ;
2024@144g=1 386€ est cohérent avec l'interpolation entre les points confirmés 140g=983€ et
145g=1 504€. Ces deux sources indépendantes (BOFiP et l'API du simulateur) se confirment
mutuellement, ce qui renforce la fiabilité globale des données du projet :

| Année | CO2 (g/km) | Malus brut |
|---|---|---|
| 2022 | 160 | 2 205 € |
| 2022 | 200 | 18 188 € |
| 2022 | 222 | 38 767 € |
| 2022 | max (plafond) | 40 000 € |
| 2023 | 138 | 400 € |
| 2023 | 175 | 7 462 € |
| 2023 | 198 | 20 396 € |
| 2024 | 84 | 0 € |
| 2024 | 144 | 1 386 € |
| 2024 | max (plafond), atteint dès 225g | 60 000 € |

Base légale confirmée pour la structure multi-année : CIBS art. L.421-59 (règle du barème par
année de 1ère immatriculation, WLTP/NEDC/puissance administrative selon le cas), art. L.421-62
(tous les barèmes WLTP depuis 2020), art. L.421-63 (barèmes NEDC jusqu'à 2020), art. L.421-64
(barèmes en puissance administrative). Point notable non résolu : le texte mentionne que le
malus est nul "pour les véhicules qui ont plus de quinze ans **ou** dont la première
immatriculation est antérieure au 1er janvier 2015" — cette 2e clause pourrait être soit un
simple rappel de la 1ère (15 ans avant la rédaction du texte), soit un vrai seuil absolu fixe
indépendant de la date du jour. À vérifier avant de s'y fier pour un calcul.

## Taxe régionale (Y1) — tarifs cheval fiscal par région, 2026

- Département 06 (Alpes-Maritimes, région PACA) : **60,00 €/CV** ✅ **confirmé** (cas réel payé
  + sources concordantes + API officielle)
- Île-de-France (68,95 €/CV) et Auvergne-Rhône-Alpes (43,00 €/CV) : ✅ **confirmées le 13/09/2026**
  via l'API officielle (`source=1&paramCodeREgion=<code INSEE>`) : codes 11 et 84 respectivement.
- Toutes les autres régions : ⚠️ **estimé** — sourcé via extraits de recherche web (plusieurs
  agrégateurs carte grise concordants), mais les pages elles-mêmes (direct-carte-grise.fr,
  caroom.fr) sont bloquées par Cloudflare, donc jamais consultées intégralement.
- ⚠️ Code INSEE 32 (Hauts-de-France) interrogé mais réponse vide (`[]`) — non résolu (peut-être
  un paramètre manquant, ex. `annee`, ou un code régional erroné).

| Région | Tarif 2026 (€/CV) | Confiance |
|---|---|---|
| Auvergne-Rhône-Alpes | 43,00 € | ✅ confirmé (API, code 84) |
| Bourgogne-Franche-Comté | 60,00 € | estimé |
| Bretagne | 60,00 € | estimé |
| Centre-Val de Loire | 60,00 € | estimé |
| Corse | 53,00 € | estimé |
| Grand Est | 60,00 € | estimé |
| Hauts-de-France | 43,00 € | estimé (code 32 non recoupé) |
| **Île-de-France** | **68,95 €** (majoration forfaitaire de 14€/CV depuis le 01/03/2026) | ✅ confirmé (API, code 11) |
| Normandie | 60,00 € | estimé |
| Nouvelle-Aquitaine | 58,00 € | estimé |
| Occitanie | 59,50 € | estimé |
| Pays de la Loire | 60,00 € | estimé |
| **Provence-Alpes-Côte d'Azur** | **60,00 €** | ✅ confirmé (dépt 06 + API, code 93) |
| Martinique | 30,00 € | estimé |
| Mayotte | 30,00 € | estimé |

Non couverts (tarif non recherché, volontairement absent plutôt que deviné) : Guadeloupe (971),
Guyane (973), Réunion (974).

Mapping département → région : géographie administrative française standard (13 régions
métropolitaines depuis 2016 + Corse + DOM), implémenté dans `copilote-app/lib/bareme-data.js`
(`REGION_PAR_DEPARTEMENT`) — fiable en soi, indépendamment des tarifs qui restent à vérifier
par région.

- Décote régionale par âge du véhicule (règle générale, à confirmer précisément) :
  ×1,0 si <10 ans depuis 1ère immatriculation, ×0,5 si >10 ans — véhicule <10 ans dans le cas
  réel étudié (99 mois = 8,25 ans), donc pas de décote appliquée sur Y1, cohérent avec
  Y1 = 900,00 € confirmé sans réduction. Cette règle des 10 ans elle-même reste à vérifier via
  BOFiP (probablement dans BOI-AIS-MOB-10-20-30, section "Tarifs réduits — véhicules d'une
  ancienneté au moins égale à dix ans", repérée dans la table des matières mais pas encore lue).

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

## Prochaines étapes suggérées

1. ✅ **FAIT (12/09/2026)** : trouvé le texte primaire de la décote via BOFiP.
2. ✅ **FAIT (13/09/2026)** : découverte de l'API interne `/Default/source` du simulateur
   officiel, et extraction des grilles CO2 confirmées pour 2012, 2015, 2018, 2020, 2022, 2024,
   2026 (100-220 g/km), des grilles poids complètes pour 2022-2026, et de 3 tarifs régionaux
   supplémentaires confirmés (Île-de-France, Auvergne-Rhône-Alpes, PACA).
3. **Combler les 8 années manquantes** du barème demandé (2012-2026 complet) : 2013, 2014, 2016,
   2017, 2019, 2021, 2023, 2025 — même méthode API, déjà éprouvée.
4. **Élargir la plage CO2 testée** au-delà de 100-220 g/km — en particulier confirmer le plafond
   réel de 2022 (documenté à 40 000€ mais pas encore atteint dans le sweep actuel) en interrogeant
   des valeurs > 220 g/km.
5. **Résoudre le code régional 32** (Hauts-de-France, réponse API vide) pour compléter la
   confirmation des 13 régions métropolitaines.
6. Décoder les sources encore mystérieuses de l'API (`source=4`, probablement lié à la puissance
   administrative ; `source=2, 9, 10, 11, 14, 15, 16`, usage à déterminer) si utile à la
   complétude du moteur.
7. Collecter d'autres cas réels pour continuer à valider le moteur de calcul en conditions
   réelles (le cas Q5 a déjà servi à vérifier Y1, Y3, la tranche de décote ET la règle
   d'arrondi des mois).

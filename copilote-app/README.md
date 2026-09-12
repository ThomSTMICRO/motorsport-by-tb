# Copilote automobile

Application conversationnelle séparée du site vitrine (`/index.html` etc. à la racine du
dépôt). **Zéro dépendance npm** — Node.js seul suffit, aucun `npm install` requis.

## Ce que fait cette app

Un chat où l'utilisateur décrit un véhicule à importer, et l'IA (Claude) pose les questions
nécessaires (département, CO2, CV fiscaux, date de mise en circulation...) puis calcule le
coût exact d'immatriculation (carte grise + malus écologique).

**Principe de conception important** : l'IA ne calcule JAMAIS un montant elle-même. Elle
appelle systématiquement le moteur de calcul déterministe (`lib/calculateur.js`), qui est la
seule source de vérité pour tout chiffre en euros. Si une donnée nécessaire (ex. le barème
d'une année non encore documentée) manque, le moteur renvoie une erreur explicite plutôt
qu'un chiffre inventé — l'IA relaie alors cette limite honnêtement à l'utilisateur.

Voir `/docs/recherche-malus-carte-grise.md` (à la racine du dépôt) pour l'historique complet
de la recherche ayant permis de construire les données de `lib/bareme-data.js`, et leur
niveau de confiance (confirmé / estimé / interpolé).

## État vérifié (ce qui a été réellement testé, pas juste écrit)

- ✅ **15 tests automatisés passent** (`npm test`) : moteur de calcul + serveur HTTP.
- ✅ **Le cas réel de calibration est reproduit exactement** : Audi Q5 2018, 162g/km CO2,
  15 CV, département 06 → **2 786,76 €**, montant identique à la facture réellement payée
  par un client (voir `test/calculateur.test.js`).
- ✅ Le serveur démarre, sert la page de chat, gère les erreurs (JSON invalide, clé API
  absente, département/année inconnus) sans jamais planter.
- ✅ L'appel réseau vers `api.anthropic.com` a été vérifié en conditions réelles (avec une
  fausse clé, pour confirmer la connectivité et la gestion d'erreur — pas encore testé avec
  une vraie clé, donc la boucle complète de conversation avec l'IA n'a pas encore tourné
  de bout en bout).

## Configuration

1. **Obtenir une clé API Anthropic** (nécessaire pour utiliser le chat, pas pour lancer le
   serveur ni faire tourner les tests) :
   - Créez un compte sur [console.anthropic.com](https://console.anthropic.com)
   - Allez dans *Settings → API Keys* et créez une nouvelle clé
   - Ajoutez du crédit si votre compte est nouveau (Settings → Billing)

2. **Configurer la clé** :
   ```bash
   cp .env.example .env
   # puis éditez .env et collez votre clé ANTHROPIC_API_KEY
   ```

3. **Lancer** (aucune installation nécessaire) :
   ```bash
   npm start
   # ou directement : node server.js
   ```
   Ouvrez [http://localhost:3000](http://localhost:3000).

4. **Lancer les tests** :
   ```bash
   npm test
   ```

## Déploiement

N'importe quel hébergeur exécutant Node.js suffit (pas de build, pas d'étape de compilation) :
Railway, Render, Fly.io, un VPS classique, etc. Définissez `ANTHROPIC_API_KEY` dans les
variables d'environnement de l'hébergeur (le fichier `.env` local n'est utile qu'en dev).
La clé n'est utilisée que côté serveur (`server.js` / `lib/anthropic-client.js`) et n'est
jamais envoyée au navigateur.

## Structure

```
copilote-app/
  server.js                  — serveur HTTP (sert le chat + orchestre l'appel à Claude)
  lib/
    calculateur.js             — moteur de calcul déterministe (SEULE source de vérité)
    bareme-data.js               — tables de barème, niveau de confiance par donnée
    tool-definition.js            — schéma de l'outil + prompt système de l'IA
    anthropic-client.js            — appel HTTP minimal à l'API Anthropic (pas de SDK)
    charger-env.js                  — mini-chargeur de fichier .env (pas de dépendance dotenv)
  public/index.html                 — interface de chat (HTML + JS vanilla, pas de build)
  test/
    calculateur.test.js               — tests du moteur de calcul (dont le cas réel Q5)
    server.test.js                     — tests d'intégration du serveur HTTP
```

## Limites connues (au 12/09/2026)

- Seule l'année de première immatriculation **2018** a un barème CO2 documenté.
  Toute autre année renvoie une erreur explicite plutôt qu'un chiffre inventé.
- Seul le département **06** a un tarif régional confirmé.
- Le malus au poids (TMOM, véhicules immatriculés après 2022) n'est pas encore implémenté
  (divergence de données non résolue — voir docs/recherche-malus-carte-grise.md).
- La boucle de conversation avec Claude (tool-use) n'a pas pu être testée de bout en bout
  faute de clé API disponible dans l'environnement de développement — sa logique est
  cependant directement calquée sur le format documenté de l'API Messages d'Anthropic.

Compléter `lib/bareme-data.js` au fur et à mesure que de nouvelles données fiables sont
trouvées (BOFiP s'est révélé une bonne source primaire, accessible sans blocage) est le
principal levier pour couvrir plus de cas.

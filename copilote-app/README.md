# Copilote automobile

Application conversationnelle séparée du site vitrine (`/index.html` etc. à la racine du
dépôt) — un projet Next.js indépendant, avec son propre `package.json`.

## Ce que fait cette app

Un chat où l'utilisateur décrit un véhicule à importer, et l'IA (Claude) pose les questions
nécessaires (département, CO2, CV fiscaux, date de mise en circulation...) puis calcule le
coût exact d'immatriculation (carte grise + malus écologique).

**Principe de conception important** : l'IA ne calcule JAMAIS un montant elle-même. Elle
appelle systématiquement le moteur de calcul déterministe (`lib/calculateur.ts`), qui est la
seule source de vérité pour tout chiffre en euros. Si une donnée nécessaire (ex. le barème
d'une année non encore documentée) manque, le moteur renvoie une erreur explicite plutôt
qu'un chiffre inventé — l'IA relaie alors cette limite honnêtement à l'utilisateur.

Voir `/docs/recherche-malus-carte-grise.md` (à la racine du dépôt) pour l'historique complet
de la recherche ayant permis de construire les données de `lib/bareme-data.ts`, et leur
niveau de confiance (confirmé / estimé / interpolé).

## Configuration

1. **Obtenir une clé API Anthropic** (nécessaire, l'app ne fonctionne pas sans) :
   - Créez un compte sur [console.anthropic.com](https://console.anthropic.com)
   - Allez dans *Settings → API Keys* et créez une nouvelle clé
   - Ajoutez du crédit si votre compte est nouveau (Settings → Billing)

2. **Installer les dépendances** :
   ```bash
   cd copilote-app
   npm install
   ```

3. **Configurer la clé** :
   ```bash
   cp .env.local.example .env.local
   # puis éditez .env.local et collez votre clé ANTHROPIC_API_KEY
   ```

4. **Lancer en local** :
   ```bash
   npm run dev
   ```
   Ouvrez [http://localhost:3000](http://localhost:3000).

## Déploiement

Ce projet est un Next.js standard, déployable sur Vercel (`vercel deploy`, en configurant
`ANTHROPIC_API_KEY` dans les variables d'environnement du projet Vercel) ou tout hébergeur
compatible Next.js (Node.js). La clé API n'est utilisée que côté serveur (`app/api/chat/route.ts`)
et n'est jamais envoyée au navigateur.

## Structure

```
copilote-app/
  app/
    page.tsx              — interface de chat
    layout.tsx
    api/chat/route.ts      — appelle l'API Anthropic avec tool-calling
  lib/
    calculateur.ts          — moteur de calcul déterministe (la seule source de vérité)
    bareme-data.ts           — tables de barème avec niveau de confiance par donnée
    tool-definition.ts        — schéma de l'outil + prompt système de l'IA
```

## Limites connues (au 12/09/2026)

- Seule l'année de première immatriculation **2018** a un barème CO2 documenté.
  Toute autre année renvoie une erreur explicite plutôt qu'un chiffre inventé.
- La courbe de décote par âge n'est pas la formule légale exacte, seulement des points
  de repère interpolés (dont un point réel confirmé par un cas payé : 99 mois → 58%).
- Seul le département 06 a un tarif régional confirmé.
- Le malus au poids (TMOM, véhicules immatriculés après 2022) n'est pas encore implémenté
  (divergence de données non résolue — voir docs/recherche-malus-carte-grise.md).

Compléter `lib/bareme-data.ts` au fur et à mesure que de nouvelles données fiables sont
trouvées est le principal levier pour couvrir plus de cas.

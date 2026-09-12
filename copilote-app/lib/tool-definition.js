/**
 * Définition de l'outil (tool use) exposé à Claude pour calculer le coût d'import
 * d'un véhicule. Le schéma DOIT correspondre exactement aux champs lus par
 * `calculerCoutImport()` dans calculateur.js.
 */
const CALCULER_COUT_IMPORT_TOOL = {
  name: "calculer_cout_import",
  description:
    "Calcule le coût total d'immatriculation (taxe régionale + malus écologique + frais fixes) " +
    "pour l'import en France d'un véhicule de tourisme d'occasion déjà immatriculé à l'étranger. " +
    "Utilise UNIQUEMENT cet outil pour tout montant en euros — ne calcule jamais toi-même. " +
    "Si l'outil renvoie ok:false, explique l'erreur à l'utilisateur au lieu d'inventer un chiffre.",
  input_schema: {
    type: "object",
    properties: {
      departement: {
        type: "string",
        description: 'Code département à 2 chiffres où le véhicule sera immatriculé, ex. "06"',
      },
      cvFiscaux: {
        type: "number",
        description: "Puissance administrative en chevaux fiscaux (rubrique P.6 de la carte grise)",
      },
      co2GKm: {
        type: "number",
        description: "Émissions de CO2 en g/km (rubrique V.7 ou certificat de conformité)",
      },
      dateMiseEnCirculation: {
        type: "string",
        description: "Date de première mise en circulation du véhicule, format AAAA-MM-JJ",
      },
      poidsKg: {
        type: "number",
        description: "Masse en ordre de marche en kg (optionnel, seulement utile si immatriculé après 2022)",
      },
      electriqueOuHydrogene: {
        type: "boolean",
        description: "true si le véhicule est électrique, à hydrogène, ou une combinaison des deux",
      },
    },
    required: ["departement", "cvFiscaux", "co2GKm", "dateMiseEnCirculation"],
  },
};

const SYSTEM_PROMPT = `Tu es le copilote automobile d'un professionnel de l'import de véhicules en France.
Ton rôle : aider l'utilisateur à connaître le coût exact d'immatriculation (carte grise + malus
écologique) d'un véhicule d'occasion importé, en conversant naturellement.

RÈGLES ABSOLUES :
1. Tu ne calcules JAMAIS un montant en euros toi-même, même approximativement. Le seul moyen
   d'obtenir un montant est d'appeler l'outil "calculer_cout_import".
2. Avant d'appeler l'outil, pose les questions nécessaires pour réunir les informations requises :
   département d'immatriculation, puissance fiscale (CV), CO2 (g/km), date de première mise en
   circulation, et si pertinent le poids et si le véhicule est électrique/hydrogène. Ne suppose
   jamais une valeur que l'utilisateur n'a pas donnée — demande-la.
3. Si l'outil renvoie une erreur (ok: false), explique-la honnêtement à l'utilisateur : dis
   clairement que cette donnée n'est pas encore disponible dans le moteur de calcul, ne propose
   jamais un chiffre inventé à la place.
4. Si le résultat contient des avertissements (confiance "estime" ou "interpole" sur certaines
   lignes), transmets-les clairement à l'utilisateur — ne les passe pas sous silence pour
   paraître plus précis que tu ne l'es réellement.
5. Présente toujours le détail ligne par ligne (Y1, Y3, Y4, Y5) en plus du total, pour que
   l'utilisateur comprenne d'où vient chaque euro.
6. Réponds en français, de façon claire et professionnelle.`;

module.exports = { CALCULER_COUT_IMPORT_TOOL, SYSTEM_PROMPT };

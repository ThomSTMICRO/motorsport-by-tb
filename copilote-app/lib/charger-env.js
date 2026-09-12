/**
 * Chargeur minimal de fichier .env, sans dépendance (équivalent maison de `dotenv`).
 * Ne remplace jamais une variable déjà présente dans l'environnement réel
 * (permet de surcharger via l'environnement du système/hébergeur en priorité).
 */
const fs = require("node:fs");
const path = require("node:path");

function chargerEnv(fichier = path.join(__dirname, "..", ".env")) {
  if (!fs.existsSync(fichier)) return;
  const contenu = fs.readFileSync(fichier, "utf8");
  for (const ligne of contenu.split("\n")) {
    const l = ligne.trim();
    if (!l || l.startsWith("#")) continue;
    const idx = l.indexOf("=");
    if (idx === -1) continue;
    const cle = l.slice(0, idx).trim();
    let valeur = l.slice(idx + 1).trim();
    if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
      valeur = valeur.slice(1, -1);
    }
    if (!(cle in process.env)) process.env[cle] = valeur;
  }
}

module.exports = { chargerEnv };

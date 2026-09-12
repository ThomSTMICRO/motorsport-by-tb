/**
 * Client minimal pour l'API Messages d'Anthropic, sans aucune dépendance externe
 * (utilise `fetch`, natif depuis Node 18+). Volontairement pas le SDK officiel —
 * ce projet vise zéro dépendance npm pour rester installable/exécutable partout
 * sans étape de build.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {string} params.system
 * @param {Array} params.tools
 * @param {Array} params.messages
 * @param {number} [params.maxTokens]
 */
async function creerMessage({ apiKey, model, system, tools, messages, maxTokens = 2048 }) {
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY absente.");
  }
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      system,
      tools,
      messages,
      max_tokens: maxTokens,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error?.message || `Erreur HTTP ${res.status} de l'API Anthropic`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

module.exports = { creerMessage };

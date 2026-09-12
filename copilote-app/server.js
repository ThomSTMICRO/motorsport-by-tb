/**
 * Serveur du copilote automobile — zéro dépendance npm.
 * Sert l'interface de chat statique et expose /api/chat qui orchestre la
 * conversation avec Claude (tool use), en déléguant tout calcul en euros au
 * moteur déterministe lib/calculateur.js.
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

require("./lib/charger-env").chargerEnv();

const { calculerCoutImport } = require("./lib/calculateur");
const { CALCULER_COUT_IMPORT_TOOL, SYSTEM_PROMPT } = require("./lib/tool-definition");
const { creerMessage } = require("./lib/anthropic-client");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 5;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function serveStatic(req, res) {
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  // Empêche de sortir de public/ par path traversal.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Interdit");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Introuvable");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": MIME_TYPES[ext] || "application/octet-stream" }).end(data);
  });
}

function lireCorpsJSON(req) {
  return new Promise((resolve, reject) => {
    let corps = "";
    req.on("data", (chunk) => {
      corps += chunk;
      if (corps.length > 1_000_000) {
        reject(new Error("Corps de requête trop volumineux"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(corps ? JSON.parse(corps) : {});
      } catch (e) {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });
}

async function gererChat(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res
      .writeHead(500, { "content-type": "application/json; charset=utf-8" })
      .end(JSON.stringify({ error: "ANTHROPIC_API_KEY absente côté serveur. Voir README.md." }));
    return;
  }

  let corps;
  try {
    corps = await lireCorpsJSON(req);
  } catch (e) {
    res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: e.message }));
    return;
  }

  const { messages } = corps;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.writeHead(400, { "content-type": "application/json" }).end(
      JSON.stringify({ error: "Historique de conversation manquant (messages[])." })
    );
    return;
  }

  const conversation = [...messages];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const reponse = await creerMessage({
        apiKey,
        model: MODEL,
        system: SYSTEM_PROMPT,
        tools: [CALCULER_COUT_IMPORT_TOOL],
        messages: conversation,
      });

      if (reponse.stop_reason !== "tool_use") {
        const texte = reponse.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        conversation.push({ role: "assistant", content: reponse.content });
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(
          JSON.stringify({ reply: texte, messages: conversation })
        );
        return;
      }

      conversation.push({ role: "assistant", content: reponse.content });

      const resultatsOutils = [];
      for (const bloc of reponse.content) {
        if (bloc.type !== "tool_use") continue;
        if (bloc.name === "calculer_cout_import") {
          const resultat = calculerCoutImport(bloc.input);
          resultatsOutils.push({
            type: "tool_result",
            tool_use_id: bloc.id,
            content: JSON.stringify(resultat),
          });
        } else {
          resultatsOutils.push({
            type: "tool_result",
            tool_use_id: bloc.id,
            content: `Outil inconnu : ${bloc.name}`,
            is_error: true,
          });
        }
      }
      conversation.push({ role: "user", content: resultatsOutils });
    }

    res.writeHead(500, { "content-type": "application/json" }).end(
      JSON.stringify({ error: "Trop d'allers-retours d'outils sans réponse finale — abandon." })
    );
  } catch (e) {
    res.writeHead(e.status || 500, { "content-type": "application/json; charset=utf-8" }).end(
      JSON.stringify({ error: e.message })
    );
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    gererChat(req, res);
    return;
  }
  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405).end("Méthode non autorisée");
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Copilote automobile démarré sur http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️  ANTHROPIC_API_KEY absente — /api/chat renverra une erreur claire tant qu'elle n'est pas définie.");
    }
  });
}

module.exports = { server };

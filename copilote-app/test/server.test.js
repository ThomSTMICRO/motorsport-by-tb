const test = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("../server");

/** Démarre le serveur sur un port éphémère pour la durée du test. */
async function avecServeurDeTest(fn) {
  delete process.env.ANTHROPIC_API_KEY; // état déterministe, indépendant de l'environnement d'exécution
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  try {
    await fn(`http://localhost:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET / sert la page de chat", async () => {
  await avecServeurDeTest(async (base) => {
    const res = await fetch(base + "/");
    assert.equal(res.status, 200);
    const texte = await res.text();
    assert.match(texte, /Copilote automobile/);
  });
});

test("GET /fichier-inexistant.js renvoie 404", async () => {
  await avecServeurDeTest(async (base) => {
    const res = await fetch(base + "/fichier-inexistant.js");
    assert.equal(res.status, 404);
  });
});

test("POST /api/chat sans ANTHROPIC_API_KEY renvoie une erreur claire (jamais un crash)", async () => {
  await avecServeurDeTest(async (base) => {
    const res = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
    });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.match(data.error, /ANTHROPIC_API_KEY/);
  });
});

test("POST /api/chat sans champ messages renvoie 400", async () => {
  await avecServeurDeTest(async (base) => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test"; // pour dépasser la vérification de clé et atteindre la validation du corps
    const res = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(res.status, 400);
  });
});

test("POST /api/chat avec un JSON invalide renvoie 400 sans planter le serveur", async () => {
  await avecServeurDeTest(async (base) => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const res = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ceci n'est pas du JSON",
    });
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(res.status, 400);
    // Le serveur doit rester utilisable après une requête malformée.
    const res2 = await fetch(base + "/");
    assert.equal(res2.status, 200);
  });
});

"use client";

import { useState } from "react";

type Bloc = { type: string; text?: string; [k: string]: unknown };
type Message = { role: "user" | "assistant"; content: string | Bloc[] };

/** Extrait le texte affichable d'un message ; renvoie null s'il n'y a rien à montrer
 *  (ex. un message qui ne contient que des blocs tool_use / tool_result internes). */
function texteAffichable(message: Message): string | null {
  if (typeof message.content === "string") return message.content;
  const morceaux = message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string);
  return morceaux.length > 0 ? morceaux.join("\n") : null;
}

export default function Page() {
  const [historique, setHistorique] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    const texte = saisie.trim();
    if (!texte || enCours) return;
    setSaisie("");
    setErreur(null);
    const nouvelHistorique: Message[] = [...historique, { role: "user", content: texte }];
    setHistorique(nouvelHistorique);
    setEnCours(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nouvelHistorique }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      setHistorique(data.messages);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Copilote automobile</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: -8 }}>
        Coût d&apos;import d&apos;un véhicule d&apos;occasion — carte grise et malus écologique
      </p>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {historique.length === 0 && (
          <div style={{ color: "#888", fontSize: 14 }}>
            Décrivez le véhicule à importer (marque, modèle, année, CO2, puissance fiscale,
            département) et je calcule le coût exact de la carte grise et du malus.
          </div>
        )}
        {historique.map((m, i) => {
          const texte = texteAffichable(m);
          if (texte === null) return null;
          const estUtilisateur = m.role === "user";
          return (
            <div
              key={i}
              style={{
                alignSelf: estUtilisateur ? "flex-end" : "flex-start",
                background: estUtilisateur ? "#111" : "#fff",
                color: estUtilisateur ? "#fff" : "#111",
                border: estUtilisateur ? "none" : "1px solid #e2e2e2",
                borderRadius: 12,
                padding: "10px 14px",
                maxWidth: "85%",
                whiteSpace: "pre-wrap",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {texte}
            </div>
          );
        })}
        {enCours && <div style={{ color: "#888", fontSize: 14 }}>Calcul en cours…</div>}
        {erreur && <div style={{ color: "#c00", fontSize: 14 }}>Erreur : {erreur}</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, position: "sticky", bottom: 16 }}>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && envoyer()}
          placeholder="Ex. : Audi Q5 2018, 252ch essence, 162g CO2, 15CV, département 06"
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #d5d5d5",
            fontSize: 14,
          }}
        />
        <button
          onClick={envoyer}
          disabled={enCours}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "#fff",
            fontSize: 14,
            cursor: enCours ? "default" : "pointer",
            opacity: enCours ? 0.6 : 1,
          }}
        >
          Envoyer
        </button>
      </div>
    </main>
  );
}

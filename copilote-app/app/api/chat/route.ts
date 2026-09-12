import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { calculerCoutImport, type EntreeCalcul } from "@/lib/calculateur";
import { CALCULER_COUT_IMPORT_TOOL, SYSTEM_PROMPT } from "@/lib/tool-definition";

// Clé API lue côté serveur uniquement — jamais exposée au client.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 5;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY absente. Voir README.md pour la configuration." },
      { status: 500 }
    );
  }

  const { messages } = (await req.json()) as { messages: Anthropic.MessageParam[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Historique de conversation manquant." }, { status: 400 });
  }

  const conversation: Anthropic.MessageParam[] = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [CALCULER_COUT_IMPORT_TOOL],
      messages: conversation,
    });

    if (response.stop_reason !== "tool_use") {
      const texte = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      conversation.push({ role: "assistant", content: response.content });
      return NextResponse.json({ reply: texte, messages: conversation });
    }

    // Il y a un (ou plusieurs) appel(s) d'outil à exécuter.
    conversation.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      if (block.name === "calculer_cout_import") {
        const resultat = calculerCoutImport(block.input as EntreeCalcul);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(resultat),
        });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Outil inconnu : ${block.name}`,
          is_error: true,
        });
      }
    }
    conversation.push({ role: "user", content: toolResults });
  }

  return NextResponse.json(
    { error: "Trop d'allers-retours d'outils sans réponse finale — abandon." },
    { status: 500 }
  );
}

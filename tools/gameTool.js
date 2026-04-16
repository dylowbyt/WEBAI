// tools/gameTool.js — Eksekutor konten game (boss, lore, dungeon)
// RULE: hanya eksekusi, tidak ada decision logic

import { getOpenAIClient, AI_MODEL } from "../config/aiConfig.js";

export async function runGameTool(prompt, history = []) {
  const client = getOpenAIClient();

  const messages = [
    {
      role: "system",
      content: `Kamu adalah game designer dan world builder berpengalaman. Ahli membuat: boss character dengan stats & lore, dungeon design, item & weapon dengan backstory, quest line & NPC dialogue, world lore, dan game balance. Berikan output detail, imersif, dan siap dipakai untuk game development.`
    },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: 1800,
    temperature: 0.85,
  });

  const content = response.choices[0]?.message?.content ?? "Gagal membuat konten game.";
  return { type: "game", content };
}

import { getOpenAIClient, AI_MODEL } from "../config/aiConfig";
import type { Message } from "../ai/memory";
import type { BrainOutput } from "../ai/brain";
import { logger } from "../lib/logger";

export async function runGameTool(
  prompt: string,
  history: Message[] = []
): Promise<BrainOutput> {
  const client = getOpenAIClient();

  logger.info({ prompt: prompt.slice(0, 80) }, "Running game tool");

  const systemMsg = `Kamu adalah game designer dan world builder yang berpengalaman.
Kamu ahli dalam membuat:
- Boss character dengan stats, kemampuan, dan lore yang mendalam
- Dungeon design dan puzzle mekanik
- Item, weapon, dan armor dengan backstory
- Quest line dan NPC dialogue
- World lore dan sejarah dunia game
- Game balance dan progression system

Berikan output yang detail, imersif, dan siap dipakai untuk game development.`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemMsg },
    ...history.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: 1800,
    temperature: 0.85,
  });

  const content = response.choices[0]?.message?.content ?? "Gagal membuat konten game.";

  return {
    type: "game",
    content,
  };
}

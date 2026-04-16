import { getOpenAIClient, AI_MODEL } from "../config/aiConfig";
import type { BrainOutput } from "../ai/brain";
import { logger } from "../lib/logger";

export async function runVideoTool(prompt: string): Promise<BrainOutput> {
  const client = getOpenAIClient();

  logger.info({ prompt: prompt.slice(0, 80) }, "Running video tool");

  const systemMsg = `Kamu adalah ahli video dan sinematografi. 
Tugasmu adalah membuat konsep video yang detail dan lengkap dari deskripsi user.
Berikan: storyboard ringkas, shot list, narasi, dan rekomendasi teknis.`;

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: systemMsg },
      { role: "user", content: `Buat konsep video untuk: ${prompt}` },
    ],
    max_tokens: 1500,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content ?? "Gagal membuat konsep video.";

  return {
    type: "video",
    content,
  };
}

import { getOpenAIClient, AI_MODEL } from "../config/aiConfig.js";

export async function runVideoTool(prompt: string) {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `Kamu adalah ahli video dan sinematografi. Buat konsep video yang detail: storyboard ringkas, shot list, narasi, dan rekomendasi teknis.`
      },
      { role: "user", content: `Buat konsep video untuk: ${prompt}` },
    ],
    max_tokens: 1500,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content ?? "Gagal membuat konsep video.";
  return { type: "video" as const, content };
}

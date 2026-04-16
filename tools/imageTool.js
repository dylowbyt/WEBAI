import { getOpenAIClient, IMAGE_MODEL } from "../config/aiConfig";
import type { BrainOutput } from "../ai/brain";
import { logger } from "../lib/logger";

export async function runImageTool(prompt: string): Promise<BrainOutput> {
  const client = getOpenAIClient();

  const enhancedPrompt = `High quality, detailed: ${prompt}`;

  logger.info({ model: IMAGE_MODEL, prompt: prompt.slice(0, 80) }, "Running image tool");

  const response = await client.images.generate({
    model: IMAGE_MODEL,
    prompt: enhancedPrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const imageUrl = response.data?.[0]?.url;

  if (!imageUrl) {
    return {
      type: "image",
      content: "Gagal menghasilkan gambar. Coba lagi dengan deskripsi yang berbeda.",
    };
  }

  return {
    type: "image",
    content: `Gambar berhasil dibuat berdasarkan prompt: "${prompt}"`,
    imageUrl,
  };
}

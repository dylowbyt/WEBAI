import { getOpenAIClient, IMAGE_MODEL } from "../config/aiConfig.js";

export async function runImageTool(prompt: string) {
  const client = getOpenAIClient();

  const response = await client.images.generate({
    model: IMAGE_MODEL,
    prompt: `High quality, detailed: ${prompt}`,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const imageUrl = response.data?.[0]?.url;

  if (!imageUrl) {
    return { type: "image" as const, content: "Gagal menghasilkan gambar. Coba dengan deskripsi berbeda." };
  }

  return {
    type: "image" as const,
    content: `Gambar berhasil dibuat untuk: "${prompt}"`,
    imageUrl,
  };
}

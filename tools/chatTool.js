import { getOpenAIClient, AI_MODEL, MAX_TOKENS, TEMPERATURE } from "../config/aiConfig";
import { SYSTEM_PROMPT } from "../config/systemPrompt";
import type { Message } from "../ai/memory";
import type { BrainOutput } from "../ai/brain";
import { logger } from "../lib/logger";

export async function runChatTool(
  userMessage: string,
  history: Message[] = []
): Promise<BrainOutput> {
  const client = getOpenAIClient();

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  logger.info({ model: AI_MODEL, historyLength: history.length }, "Running chat tool");

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  const content = response.choices[0]?.message?.content ?? "Maaf, tidak ada respons.";

  return {
    type: "chat",
    content,
  };
}

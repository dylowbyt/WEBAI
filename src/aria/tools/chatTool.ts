import { getOpenAIClient, AI_MODEL, MAX_TOKENS, TEMPERATURE } from "../config/aiConfig.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function runChatTool(userMessage: string, history: ChatMessage[] = []) {
  const client = getOpenAIClient();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  const content = response.choices[0]?.message?.content ?? "Maaf, tidak ada respons.";
  return { type: "chat" as const, content };
}

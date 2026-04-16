// tools/chatTool.js — Eksekutor text AI (OpenAI GPT)
// RULE: hanya eksekusi, tidak ada decision logic

import { getOpenAIClient, AI_MODEL, MAX_TOKENS, TEMPERATURE } from "../config/aiConfig.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";

export async function runChatTool(userMessage, history = []) {
  const client = getOpenAIClient();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  const content = response.choices[0]?.message?.content ?? "Maaf, tidak ada respons.";
  return { type: "chat", content };
}

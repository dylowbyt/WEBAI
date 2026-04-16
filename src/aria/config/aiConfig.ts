import OpenAI from "openai";

export const AI_MODEL    = "gpt-4o-mini";
export const IMAGE_MODEL = "dall-e-3";
export const MAX_TOKENS  = 2048;
export const TEMPERATURE = 0.7;

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
    const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
    if (!apiKey) throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }
  return _client;
}

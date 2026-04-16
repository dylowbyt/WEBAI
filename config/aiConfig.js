// config/aiConfig.js — API key, model settings
import OpenAI from "openai";

export const AI_MODEL    = "gpt-4o-mini";
export const IMAGE_MODEL = "dall-e-3";
export const MAX_TOKENS  = 2048;
export const TEMPERATURE = 0.7;

let _client = null;

export function getOpenAIClient() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY belum diset di environment variables");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

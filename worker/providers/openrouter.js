import { callOpenAICompatible } from "./openai-compatible.js";
export async function callOpenrouter(messages, env) {
  return callOpenAICompatible({
    endpoint: env.OPENROUTER_ENDPOINT || "https://openrouter.ai/api/v1/chat/completions",
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL || "openrouter/auto",
    messages,
    headers: {
      ...(env.PELON_SITE_URL ? { "HTTP-Referer": env.PELON_SITE_URL } : {}),
      "X-Title": "Pelon"
    }
  });
}

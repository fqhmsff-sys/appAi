import { callOpenAICompatible } from "./openai-compatible.js";
export async function callMistral(messages, env) {
  return callOpenAICompatible({
    endpoint: env.MISTRAL_ENDPOINT || "https://api.mistral.ai/v1/chat/completions",
    apiKey: env.MISTRAL_API_KEY,
    model: env.MISTRAL_MODEL || "mistral-small-latest",
    messages
  });
}

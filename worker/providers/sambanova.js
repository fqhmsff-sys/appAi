import { callOpenAICompatible } from "./openai-compatible.js";
export async function callSambanova(messages, env) {
  return callOpenAICompatible({
    endpoint: env.SAMBANOVA_ENDPOINT || "https://api.sambanova.ai/v1/chat/completions",
    apiKey: env.SAMBANOVA_API_KEY,
    model: env.SAMBANOVA_MODEL || "Meta-Llama-3.3-70B-Instruct",
    messages
  });
}

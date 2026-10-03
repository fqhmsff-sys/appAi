import { callOpenAICompatible } from "./openai-compatible.js";
export async function callGithub(messages, env) {
  return callOpenAICompatible({
    endpoint: env.GITHUB_MODELS_ENDPOINT || "https://models.github.ai/inference/chat/completions",
    apiKey: env.GITHUB_TOKEN,
    model: env.GITHUB_MODEL || "openai/gpt-4.1-mini",
    messages
  });
}

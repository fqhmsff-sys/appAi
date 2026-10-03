import { callOpenAICompatible } from "./openai-compatible.js";
export async function callTogether(messages, env) {
  return callOpenAICompatible({
    endpoint: env.TOGETHER_ENDPOINT || "https://api.together.xyz/v1/chat/completions",
    apiKey: env.TOGETHER_API_KEY,
    model: env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    messages
  });
}

export async function callPollinations(messages, env) {
  if (!env.POLLINATIONS_TEXT_ENABLED) throw new Error("Pollinations text dinonaktifkan untuk test ini");
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  const response = await fetch(env.POLLINATIONS_TEXT_ENDPOINT || "https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: env.POLLINATIONS_MODEL || "openai",
      stream: false
    })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${raw.slice(0, 500)}`);
  try {
    const data = JSON.parse(raw);
    const text = data?.choices?.[0]?.message?.content || data?.text;
    if (text) return String(text);
  } catch {}
  if (raw.trim()) return raw.trim();
  throw new Error("Pollinations tidak mengembalikan teks");
}

export async function callCohere(messages, env) {
  if (!env.COHERE_API_KEY) throw new Error("API key belum diisi");
  const response = await fetch(env.COHERE_ENDPOINT || "https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.COHERE_API_KEY}`
    },
    body: JSON.stringify({
      model: env.COHERE_MODEL || "command-a-03-2025",
      messages
    })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${raw.slice(0, 500)}`);
  const data = JSON.parse(raw);
  const text = data?.message?.content?.map?.((item) => item.text || "").join("") || data?.message?.content?.[0]?.text;
  if (!text) throw new Error("Cohere tidak mengembalikan teks");
  return String(text).trim();
}

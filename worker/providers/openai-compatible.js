export async function callOpenAICompatible({ endpoint, apiKey, model, messages, headers = {} }) {
  if (!apiKey) throw new Error("API key belum diisi");
  if (!model) throw new Error("Model belum diisi");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...headers
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${raw.slice(0, 500)}`);

  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("Respons provider bukan JSON"); }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Provider tidak mengembalikan teks");
  return String(text);
}

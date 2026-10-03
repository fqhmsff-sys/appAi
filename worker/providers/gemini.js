export async function callGemini(messages, env, systemInstruction = "") {
  const model = env.GEMINI_MODEL || "gemini-3.6-flash";
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.content || "") }]
  }));

  const body = { contents };
  if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    }
  );

  const raw = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${raw.slice(0, 500)}`);

  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini tidak mengembalikan teks");
  return text;
}

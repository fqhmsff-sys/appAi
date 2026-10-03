export function mockResponse(messages) {
  const encoder = new TextEncoder();
  const last = messages[messages.length - 1]?.content || "";
  const text =
    `Pelon sudah menerima pesan Anda: "${last}". ` +
    `Gateway V1 sudah aktif dalam mode pengujian. Hubungkan API provider melalui Cloudflare Worker Secrets untuk mengaktifkan pemrosesan AI.`;

  const chunks = [];
  for (let i = 0; i < text.length; i += 12) {
    chunks.push(`data: ${JSON.stringify({ text: text.slice(i, i + 12) })}\n\n`);
  }
  chunks.push("data: [DONE]\n\n");

  return {
    status: 200,
    contentType: "text/event-stream; charset=utf-8",
    body: chunks.join("")
  };
}

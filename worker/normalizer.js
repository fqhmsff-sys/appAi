export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && ["user", "assistant", "system"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content.slice(0, 50000) : ""
    }))
    .filter((message) => message.content.length > 0);
}

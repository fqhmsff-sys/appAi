import { orchestrateChat, orchestrateGroupChat } from "./orchestrator.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export async function routeRequest(request, env, ctx) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (url.pathname === "/api/health") {
    return Response.json({ ok: true, service: "pelon-gateway" }, { headers: cors });
  }

  if (url.pathname === "/api/group-chat" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await orchestrateGroupChat(body, env, ctx);
      return new Response(result.body, {
        status: result.status || 200,
        headers: { "Content-Type": result.contentType || "application/json", ...cors }
      });
    } catch (error) {
      return Response.json({ error: "Pelon group gateway error", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 500, headers: cors });
    }
  }

  if (url.pathname === "/api/chat" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await orchestrateChat(body, env, ctx);
      return new Response(result.body, {
        status: result.status || 200,
        headers: { "Content-Type": result.contentType || "application/json", ...cors }
      });
    } catch (error) {
      return Response.json(
        { error: "Pelon gateway error", detail: error instanceof Error ? error.message : "Unknown error" },
        { status: 500, headers: cors }
      );
    }
  }

  return new Response("Not Found", { status: 404, headers: cors });
}

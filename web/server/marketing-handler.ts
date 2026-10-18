import type { IncomingMessage, ServerResponse } from "node:http";

type JsonObject = Record<string, unknown>;

// Forward to the real MCP tool/resource. The playground has no separate evaluator.
export async function handleMarketing(request: IncomingMessage, response: ServerResponse, mcpUrl = "http://127.0.0.1:3000/mcp") {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status: number, data: unknown) => { response.statusCode = status; response.end(JSON.stringify(data)); };
  const path = request.url?.split("?")[0];
  const examples = path === "/api/marketing/examples";
  const expectedMethod = examples ? "GET" : "POST";
  if (request.method !== expectedMethod) { response.setHeader("Allow", expectedMethod); return send(405, { error: `Use ${expectedMethod} for this endpoint.` }); }
  let input: unknown;
  if (!examples) {
    if (!request.headers["content-type"]?.includes("application/json")) return send(415, { error: "Submit the request as application/json." });
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 1_000_000) return send(413, { error: "The request exceeds the 1 MB limit." });
        chunks.push(buffer);
      }
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!input || typeof input !== "object" || Array.isArray(input)) return send(400, { error: "The request must be a JSON object." });
    } catch { return send(400, { error: "The request body is not valid JSON." }); }
  }
  const signal = AbortSignal.timeout(15_000);
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  async function rpc(id: number, method: string, params: unknown): Promise<JsonObject> {
    const upstream = await fetch(mcpUrl, { method: "POST", headers, signal,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
    if (!upstream.ok) throw new Error("MCP connection failed");
    const session = upstream.headers.get("mcp-session-id");
    if (session) headers["mcp-session-id"] = session;
    const raw = await upstream.text();
    let payload: JsonObject;
    if (upstream.headers.get("content-type")?.includes("text/event-stream")) {
      const messages = raw.split(/\r?\n\r?\n/).flatMap((frame) => {
        const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!data) return [];
        try { return [JSON.parse(data) as JsonObject]; } catch { return []; }
      });
      payload = messages.find((message) => message.id === id) ?? {};
    } else payload = JSON.parse(raw) as JsonObject;
    if (payload.id !== id || (!payload.result && !payload.error)) throw new Error("Unreadable MCP response");
    return payload;
  }
  try {
    const initialized = await rpc(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "agent-passport-marketing-playground", version: "1.0.0" } });
    const initialization = initialized.result as JsonObject | undefined;
    if (!initialization || typeof initialization.protocolVersion !== "string") throw new Error("MCP initialization failed");
    headers["mcp-protocol-version"] = initialization.protocolVersion;
    const payload = await rpc(2, examples ? "resources/read" : "tools/call", examples ? { uri: "marketing://examples" }
      : { name: "check_marketing_email", arguments: input });
    const result = payload.result as JsonObject | undefined;
    if (payload.error || result?.isError === true) {
      const error = payload.error as JsonObject | undefined;
      const content = result?.content as { text?: string }[] | undefined;
      return send(422, { error: typeof error?.message === "string" ? error.message : content?.find((item) => item.text)?.text ?? "The MCP tool rejected this request." });
    }
    if (examples) {
      const contents = result?.contents as { text?: string }[] | undefined;
      const text = contents?.[0]?.text;
      if (!text) throw new Error("Examples unavailable");
      return send(200, JSON.parse(text));
    }
    if (!result?.structuredContent) throw new Error("Assessment unavailable");
    return send(200, result.structuredContent);
  } catch {
    return send(503, { error: /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/.test(mcpUrl)
      ? "The marketing MCP server is unavailable. Start it from mcp/ with npm run dev, then try again."
      : "The marketing policy service is temporarily unavailable. Try again shortly." });
  }
}

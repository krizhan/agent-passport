import type { IncomingMessage, ServerResponse } from "node:http";
import { normalizeEvent } from "./normalize.js";
import { latestRequests, REQUEST_CATEGORIES, REQUEST_LIMIT_PER_CATEGORY, type RequestPage, type RequestRecord } from "../src/lib/requests.js";

export type GatewayConfig = { apiKey?: string; serverId?: string };

export async function handleRequests(
  request: IncomingMessage,
  response: ServerResponse,
  config: GatewayConfig,
  fetcher: typeof fetch = fetch,
) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status: number, data: unknown) => {
    response.statusCode = status;
    response.end(JSON.stringify(data));
  };
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return send(405, { error: "Only GET is supported." });
  }
  if (!config.apiKey || !config.serverId) {
    return send(503, { error: "Request history is not connected yet. Configure the server’s Manufact connection and try again." });
  }
  const query = new URL(request.url ?? "/", "http://localhost").searchParams;
  const days = query.get("days") ?? "7";
  if (!["1", "7", "30"].includes(days) || query.has("cursor") || query.has("startTime")) {
    return send(400, { error: "Choose a valid history period. Only the latest requests are available." });
  }
  const startTime = new Date(Date.now() - Number(days) * 86400_000).toISOString();
  const url = new URL(`https://cloud.manufact.com/api/v1/servers/${encodeURIComponent(config.serverId)}/gateway-events`);
  url.searchParams.set("startTime", startTime);
  url.searchParams.set("limit", "100");
  // Scan newest-first pages until all three categories are full or history ends.
  // Cap each scan at 1,000 gateway events and 12 seconds. Some
  // gateway deployments return no rows when using the exact `method` filter.
  try {
    const signal = AbortSignal.timeout(12_000);
    const records = new Map<string, RequestRecord>();
    const cursors = new Set<string>();
    let scannedEvents = 0;
    let nextCursor: string | null = null;
    let selected: RequestRecord[] = [];
    let categoriesFull = false;
    for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
      if (nextCursor) url.searchParams.set("cursor", nextCursor);
      const upstream = await fetcher(url, {
        headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json", "User-Agent": "agent-passport-demo/1.0" }, signal,
      });
      if (!upstream.ok) {
        const error = upstream.status === 401 || upstream.status === 403
          ? "The Manufact connection could not read request history. Check the server credential and its access."
          : upstream.status === 429 ? "Request history is temporarily rate limited. Try again shortly."
          : "Manufact request history is temporarily unavailable. Try again shortly.";
        return send(502, { error });
      }
      const data = await upstream.json() as { events?: unknown[]; nextCursor?: unknown };
      if (!Array.isArray(data.events)) return send(502, { error: "Manufact returned an unreadable history response." });
      scannedEvents += data.events.length;
      for (const event of data.events) {
        const record = normalizeEvent(event);
        if (record && !records.has(record.id)) records.set(record.id, record);
      }
      selected = latestRequests([...records.values()]);
      categoriesFull = selected.length === REQUEST_LIMIT_PER_CATEGORY * REQUEST_CATEGORIES.length;
      nextCursor = typeof data.nextCursor === "string" && data.nextCursor ? data.nextCursor : null;
      if (categoriesFull || !nextCursor) break;
      if (cursors.has(nextCursor)) return send(502, { error: "Manufact returned an unreadable history cursor." });
      cursors.add(nextCursor);
    }
    const page: RequestPage = {
      requests: selected, fetchedAt: new Date().toISOString(), startTime, scannedEvents,
      scanLimitReached: !!nextCursor && !categoriesFull,
    };
    return send(200, page);
  } catch {
    return send(502, { error: "Could not reach Manufact request history. Try again shortly." });
  }
}

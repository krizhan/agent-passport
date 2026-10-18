import assert from "node:assert/strict";
import { test } from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequests, type GatewayConfig } from "./requests-handler.ts";

const config = { apiKey: "server-only-secret", serverId: "server-id" };
async function run(url = "/api/requests", fetcher: typeof fetch = async () => Response.json({ events: [], nextCursor: null }), method = "GET", settings: GatewayConfig = config) {
  const headers = new Map<string, string>();
  let body = "";
  const response = { statusCode: 0, setHeader(key: string, value: string) { headers.set(key, value); }, end(value: string) { body = value; } };
  await handleRequests({ url, method } as IncomingMessage, response as unknown as ServerResponse, settings, fetcher);
  return { status: response.statusCode, headers, body, data: JSON.parse(body) };
}

test("bounded internal reads preserve upstream cursors without exposing pagination", async () => {
  const cursor = "opaque+cursor/with=characters";
  let calls = 0;
  const result = await run("/api/requests?days=7", async (target, options) => {
    const url = new URL(String(target));
    assert.equal(url.origin, "https://cloud.manufact.com");
    assert.equal(url.searchParams.get("limit"), "100");
    assert.equal(url.searchParams.get("cursor"), calls === 0 ? null : cursor);
    assert.ok(Number.isFinite(Date.parse(url.searchParams.get("startTime")!)));
    assert.equal(new Headers(options?.headers).get("authorization"), "Bearer server-only-secret");
    calls++;
    return Response.json(calls === 1 ? { events: [{ id: "ignored", mcp_method: "initialize" }], nextCursor: cursor } : { events: [], nextCursor: null });
  });
  assert.equal(result.status, 200);
  assert.equal(calls, 2);
  assert.equal(result.data.nextCursor, undefined);
  assert.equal(result.data.scannedEvents, 1);
  assert.deepEqual(result.data.requests, []);
  assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  assert.doesNotMatch(result.body, /server-only-secret/);
});

function event(category: "trade" | "marketing", index: number) {
  return {
    id: `${category}-${index}`, time: new Date(Date.UTC(2026, 9, 17, 12, 0, index)).toISOString(),
    mcp_method: "tools/call", resource_name: "check_action",
    request_payload: { params: { name: "check_action", arguments: category === "trade"
      ? { product: "Coffee", from_country: "US", to_country: "CO" }
      : { action_type: "marketing_email", recipient_country: "CA" } } },
    response_payload: { result: { structuredContent: { decision: "REVIEW" } } },
  };
}

test("returns only the latest ten unique requests per category and stops once full", async () => {
  let calls = 0;
  const events = [...Array.from({ length: 15 }, (_, index) => event("trade", index)),
    ...Array.from({ length: 12 }, (_, index) => event("marketing", index)), event("trade", 14)];
  const result = await run(undefined, async () => {
    calls++;
    return Response.json({ events, nextCursor: "not-needed" });
  });
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.equal(result.data.requests.length, 20);
  assert.deepEqual(result.data.requests.filter((record: { category: string }) => record.category === "trade").map((record: { id: string }) => record.id),
    Array.from({ length: 10 }, (_, index) => `trade-${14 - index}`));
  assert.deepEqual(result.data.requests.filter((record: { category: string }) => record.category === "marketing").map((record: { id: string }) => record.id),
    Array.from({ length: 10 }, (_, index) => `marketing-${11 - index}`));
  assert.equal(result.data.scanLimitReached, false);
});

test("continues scanning when one category has fewer requests", async () => {
  let calls = 0;
  const result = await run(undefined, async () => {
    calls++;
    return Response.json(calls === 1
      ? { events: Array.from({ length: 15 }, (_, index) => event("trade", index + 30)), nextCursor: "older-marketing" }
      : { events: Array.from({ length: 12 }, (_, index) => event("marketing", index)), nextCursor: null });
  });
  assert.equal(calls, 2);
  assert.equal(result.data.requests.filter((record: { category: string }) => record.category === "trade").length, 10);
  assert.equal(result.data.requests.filter((record: { category: string }) => record.category === "marketing").length, 10);
});

test("calls without captured request details or readable results are excluded", async () => {
  const result = await run(undefined, async () => Response.json({ events: [event("trade", 1),
    { ...event("trade", 2), response_payload: null },
    { ...event("trade", 3), request_payload: null },
    { ...event("marketing", 4), response_payload: { result: { content: [] } } },
    { id: "uncaptured", time: "2026-10-17T12:00:00Z", resource_name: "check_action", mcp_method: "tools/call" }], nextCursor: null }));
  assert.equal(result.data.requests.length, 1);
  assert.equal(result.data.requests[0].id, "trade-1");
});

test("missing details do not consume the ten-request category limit", async () => {
  let calls = 0;
  const result = await run(undefined, async () => {
    calls++;
    return Response.json(calls === 1
      ? { events: [...Array.from({ length: 10 }, (_, index) => ({ ...event("trade", index + 30), response_payload: null })),
        ...Array.from({ length: 10 }, (_, index) => event("marketing", index + 30))], nextCursor: "captured-trade" }
      : { events: Array.from({ length: 12 }, (_, index) => event("trade", index)), nextCursor: null });
  });
  assert.equal(calls, 2);
  assert.equal(result.data.requests.length, 20);
  assert.deepEqual(result.data.requests.filter((record: { category: string }) => record.category === "trade").map((record: { id: string }) => record.id),
    Array.from({ length: 10 }, (_, index) => `trade-${11 - index}`));
});

test("a sparse category cannot cause an unbounded scan", async () => {
  let calls = 0;
  const result = await run(undefined, async () => {
    calls++;
    return Response.json({ events: [], nextCursor: `page-${calls}` });
  });
  assert.equal(calls, 10);
  assert.equal(result.data.scanLimitReached, true);
  assert.deepEqual(result.data.requests, []);
});

test("upstream failures do not expose credentials or response bodies", async () => {
  const result = await run(undefined, async () => new Response("server-only-secret and upstream diagnostic", { status: 403 }));
  assert.equal(result.status, 502);
  assert.doesNotMatch(result.body, /server-only-secret|upstream diagnostic/);
  const timeout = await run(undefined, async () => { throw new Error("server-only-secret"); });
  assert.equal(timeout.status, 502);
  assert.doesNotMatch(timeout.body, /server-only-secret/);
});

test("bad queries, unsupported methods, and missing configuration fail without an upstream call", async () => {
  const neverFetch: typeof fetch = async () => { throw new Error("Must not be called"); };
  assert.equal((await run("/api/requests?days=10000", neverFetch)).status, 400);
  assert.equal((await run("/api/requests?startTime=invalid", neverFetch)).status, 400);
  assert.equal((await run(undefined, neverFetch, "POST")).status, 405);
  assert.equal((await run(undefined, neverFetch, "GET", {})).status, 503);
});

test("invalid upstream data fails instead of pretending history is empty", async () => {
  assert.equal((await run(undefined, async () => Response.json({ error: "unexpected" }))).status, 502);
});

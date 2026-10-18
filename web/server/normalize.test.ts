import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEvent } from "./normalize.ts";

const purchase = { product: "Coffee", from_country: "US", to_country: "CO" };
const event = (data: Record<string, unknown> = {}, input: Record<string, unknown> = purchase) => ({
  id: "request-1", time: "2026-10-17T12:00:00Z", mcp_method: "tools/call", resource_name: "check_action",
  request_payload: { params: { name: "check_action", arguments: input } },
  response_payload: { result: { structuredContent: { decision: "REVIEW", ...data } } },
  status_code: 200, tool_call_success: true,
});

test("legacy purchase results retain their recorded decision without inventing routing", () => {
  const record = normalizeEvent(event({ purchase, policy_version: "international-purchase/0.5.0", execution_performed: false }));
  assert.equal(record?.title, "Purchase Coffee");
  assert.equal(record?.route, "United States → Colombia");
  assert.equal(record?.outcome, "REVIEW");
  assert.equal(record?.policy.id, null);
  assert.equal(record?.policy.reason, null);
  assert.equal(record?.execution, "not_performed");
});

test("invalid country inputs are not truncated into a different valid country", () => {
  const record = normalizeEvent(event({}, { ...purchase, from_country: "USA" }));
  assert.equal(record?.route, "USA → Colombia");
});

test("marketing shows purpose, country, recipients, and the recorded general pack", () => {
  const record = normalizeEvent(event({ routing: { policy_id: "general-marketing", kind: "general", reason: "General checklist selected." } }, {
    action_type: "marketing_email", recipient_country: "CA", recipient_count: 1000, purpose: "Product launch",
  }));
  assert.equal(record?.category, "marketing");
  assert.equal(record?.title, "Product launch");
  assert.equal(record?.route, "Canada · 1,000 recipients");
  assert.equal(record?.policy.id, "general-marketing");
});

test("a successful HTTP call can still be a blocked budget assessment", () => {
  const record = normalizeEvent(event({ decision: "BLOCK", requirements: [{ id: "purchase_budget", title: "Your budget", basis: "purchase_constraint", status: "FAILED", detail: "Over budget." }] }, { ...purchase, amount: 1500, budget: 0 }));
  assert.equal(record?.outcome, "BLOCK");
  assert.equal(record?.requirements[0].basis, "purchase_constraint");
  assert.equal(record?.facts.find((fact) => fact.label === "Submitted budget")?.value, "0");
});

test("checklists and missing payloads are not presented as approval", () => {
  const checklist = normalizeEvent({ ...event({ decision: undefined, requirements: [] }), resource_name: "get_requirements" });
  assert.equal(checklist?.outcome, "CHECKLIST");
  assert.equal(checklist?.execution, "not_reported");
  const missing = normalizeEvent({ ...event(), request_payload: null, response_payload: null });
  assert.equal(missing?.outcome, "UNAVAILABLE");
  assert.equal(missing?.category, "unknown");
  assert.equal(missing?.payloadCaptured, false);
});

test("MCP and JSON-RPC errors remain failures even over HTTP 200", () => {
  assert.equal(normalizeEvent({ ...event(), response_payload: { result: { isError: true } } })?.outcome, "ERROR");
  assert.equal(normalizeEvent({ ...event(), mcp_response_status: "error", response_payload: null })?.outcome, "ERROR");
  assert.equal(normalizeEvent({ ...event(), response_payload: { error: { message: "Missing product" } } })?.summary, "Missing product");
});

test("JSON strings, SSE captures, and text-only historical results are readable", () => {
  const response = { result: { content: [{ type: "text", text: JSON.stringify({ decision: "NEEDS_EVIDENCE", summary: "Amount needed." }) }] } };
  const record = normalizeEvent({ ...event(), request_payload: JSON.stringify(event().request_payload), response_payload: `event: message\ndata: ${JSON.stringify(response)}\n\n` });
  assert.equal(record?.outcome, "NEEDS_EVIDENCE");
  assert.equal(record?.summary, "Amount needed.");
});

test("unknown traffic and broken events are ignored; metadata and unsafe URLs do not leak", () => {
  assert.equal(normalizeEvent({ ...event(), mcp_method: "tools/list" }), null);
  assert.equal(normalizeEvent({ ...event(), resource_name: "other_tool" }), null);
  assert.equal(normalizeEvent({ ...event(), time: "invalid" }), null);
  const record = normalizeEvent({ ...event({ requirements: [{ id: "a", source_url: "javascript:alert(1)" }, { id: "b", source_url: "https://www.usitc.gov/harmonized_tariff_information" }] }), client_ip: "private-ip", auth_header: "secret-token", user_id: "private-user" });
  assert.equal(record?.requirements[0].sourceUrl, null);
  assert.equal(record?.requirements[1].sourceUrl, "https://www.usitc.gov/harmonized_tariff_information");
  assert.doesNotMatch(JSON.stringify(record), /private-ip|secret-token|private-user/);
});

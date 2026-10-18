import type { RequestRecord, Outcome } from "../src/lib/requests.js";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const string = (value: unknown, max = 2000): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

// Captures can be decoded JSON, JSON strings, or an SSE response body.
function payload(value: unknown): ObjectValue {
  if (typeof value !== "string") return object(value);
  try { return object(JSON.parse(value)); } catch { /* Try SSE frames next. */ }
  for (const frame of value.split(/\r?\n\r?\n/).reverse()) {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n");
    try {
      const parsed = object(JSON.parse(data));
      if (parsed.result || parsed.error) return parsed;
    } catch { /* A partial or non-JSON capture cannot establish a result. */ }
  }
  return {};
}

function resultData(result: ObjectValue): ObjectValue {
  const structured = object(result.structuredContent);
  if (Object.keys(structured).length) return structured;
  for (const entry of list(result.content)) {
    const block = object(entry);
    if (block.type === "text" && typeof block.text === "string") {
      try {
        const parsed = object(JSON.parse(block.text));
        if (Object.keys(parsed).length) return parsed;
      } catch { /* Plain text is not a recorded policy assessment. */ }
    }
  }
  return {};
}

function country(value: unknown): string | null {
  const code = string(value, 50)?.toUpperCase();
  if (!code) return null;
  if (!/^[A-Z]{2}$/.test(code)) return code;
  return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
}

function sourceUrl(value: unknown): string | null {
  const raw = string(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

// Retain names from recorded history; only the explicit names are public tools.
const tradeTools = new Set(["check_import_export", "get_import_export_requirements", "get_import_export_remediation_plan",
  "check_action", "get_requirements", "get_remediation_plan"]);
const tools = new Set([...tradeTools, "check_marketing_email", "screen_restricted_party"]);

// Project a gateway event into explicitly allowed product fields. Never forward
// headers, IP addresses, actor IDs, session metadata, or entire captured bodies.
export function normalizeEvent(raw: unknown): RequestRecord | null {
  const event = object(raw);
  const request = payload(event.request_payload);
  const params = object(request.params);
  const tool = string(event.resource_name) || string(params.name);
  if (!tool || !tools.has(tool)) return null;
  const method = string(event.mcp_method) || string(request.method);
  if (method && method !== "tools/call") return null;
  const id = string(event.id);
  const time = string(event.time);
  if (!id || !time || !Number.isFinite(Date.parse(time))) return null;

  const response = payload(event.response_payload);
  const result = object(response.result ?? response);
  const data = resultData(result);
  const input = object(params.arguments);
  // Legacy deployments recorded `purchase`, before adding action and routing.
  const echoed = object(data.action ?? data.purchase);
  const action = Object.keys(input).length ? input : echoed;
  const category = action.action_type === "restricted_party_screening" || tool === "screen_restricted_party" ? "screening"
    : action.action_type === "marketing_email" || tool === "check_marketing_email" ? "marketing"
    : tradeTools.has(tool) || action.action_type === "purchase" || (action.product && action.from_country && action.to_country) ? "trade" : "unknown";
  const error = object(response.error);
  const failed = result.isError === true || event.tool_call_success === false
    || event.mcp_response_status === "error" || event.status === "error"
    || Object.keys(error).length > 0 || (number(event.status_code) ?? 0) >= 400;
  const decision = string(data.decision);
  const outcome: Outcome = failed ? "ERROR"
    : decision === "BLOCK" || decision === "NEEDS_EVIDENCE" || decision === "REVIEW" ? decision
    : (tool === "get_import_export_requirements" || tool === "get_requirements") && Array.isArray(data.requirements) ? "CHECKLIST" : "UNAVAILABLE";
  const routing = object(data.routing);
  const facts: RequestRecord["facts"] = [];
  const fact = (label: string, value: string | null) => { if (value) facts.push({ label, value }); };
  let title = "Request details not captured";
  let route = "Action not recorded";
  if (category === "screening") {
    const screening = object(data.screening);
    const source = object(screening.source);
    title = `Screen ${string(action.name, 200) ?? "counterparty"}`;
    route = `${country(action.country) ?? "Country not supplied"} · U.S. list screening`;
    fact("Requested action", "Restricted-party name screening");
    fact("Party name", string(action.name, 200));
    fact("Known aliases", list(action.aliases).map((value) => string(value, 200)).filter(Boolean).join(", ") || null);
    fact("Party country", country(action.country));
    fact("Party address", string(action.address, 500));
    fact("Screening result", string(screening.status));
    fact("Possible matches", number(screening.total_matches)?.toLocaleString("en-US") ?? null);
    fact("Records screened", number(source.records_screened)?.toLocaleString("en-US") ?? null);
    fact("Data mode", source.mode === "bundled_json" ? "Bundled JSON snapshot; no live lookup" : null);
    fact("Snapshot freshness", string(source.freshness));
    fact("Snapshot age (hours)", number(source.age_hours)?.toLocaleString("en-US") ?? null);
    fact("Data generated", string(source.dataset_generated_at));
    fact("Data retrieved", string(source.retrieved_at));
    fact("Snapshot SHA-256", string(source.sha256));
  } else if (category === "marketing") {
    const recipientCountry = country(action.recipient_country);
    const count = number(action.recipient_count);
    title = string(action.purpose, 500) ?? "Marketing email campaign";
    route = `${recipientCountry ?? "Country not recorded"}${count !== null ? ` · ${count.toLocaleString("en-US")} recipients` : ""}`;
    fact("Requested action", "Send marketing email");
    fact("Recipient country", recipientCountry);
    fact("Recipients", count?.toLocaleString("en-US") ?? null);
    fact("Campaign purpose", string(action.purpose, 500));
  } else if (category === "trade") {
    title = `Purchase ${string(action.product, 500) ?? "goods"}`;
    route = `${country(action.from_country) ?? "Origin not recorded"} → ${country(action.to_country) ?? "Destination not recorded"}`;
    fact("Requested action", "International purchase");
    fact("Product", string(action.product, 500));
    fact("Ships from", country(action.from_country));
    fact("Destination", country(action.to_country));
    fact("Purchase amount", number(action.amount)?.toLocaleString("en-US") ?? null);
    fact("Submitted budget", number(action.budget)?.toLocaleString("en-US") ?? null);
  }
  const requirements = list(data.requirements).slice(0, 50).map((raw, index) => {
    const item = object(raw);
    return {
      id: string(item.id) ?? String(index),
      title: string(item.title) ?? "Requirement",
      detail: string(item.detail) ?? string(item.description) ?? "No explanation was recorded.",
      status: string(item.status),
      basis: string(item.basis),
      sourceUrl: sourceUrl(item.source_url),
    };
  });
  const summary = failed ? string(error.message) ?? string(event.error_message) ?? "The tool call failed. No successful compliance result was recorded."
    : string(data.summary) ?? (outcome === "CHECKLIST" ? "The tool returned a checklist of requirements to review. This is not a clearance decision."
      : "The captured response does not contain a readable compliance result. Payload capture may have been off or the response may be incomplete.");
  const screening = object(data.screening);
  return {
    id, time, tool, category, title, route, outcome, summary,
    durationMs: number(event.duration_ms), facts, requirements,
    ...(category === "screening" ? { screening: {
      status: string(screening.status), totalMatches: number(screening.total_matches),
      truncated: screening.truncated === true, error: string(screening.error),
      candidates: list(screening.matches).slice(0, 20).map((raw, index) => {
        const candidate = object(raw);
        return { id: string(candidate.id) ?? String(index), name: string(candidate.name, 500) ?? "Unnamed candidate",
          source: string(candidate.source, 500) ?? "Source not captured", matchedName: string(candidate.matched_name, 500),
          sourceUrl: sourceUrl(candidate.source_list_url) ?? sourceUrl(candidate.source_information_url) };
      }),
    } } : {}),
    policy: {
      id: string(routing.policy_id), version: string(data.policy_version),
      reason: string(routing.reason), scope: string(data.scope), kind: string(routing.kind),
    },
    nextSteps: list(data.remediation_plan).slice(0, 50).flatMap((raw) => {
      const step = object(raw);
      const instruction = string(step.instruction);
      return instruction ? [{ owner: step.owner === "agent" ? "Agent" : step.owner === "human" ? "Human reviewer" : "Reviewer", instruction }] : [];
    }),
    payloadCaptured: Object.keys(request).length > 0 && Object.keys(response).length > 0,
    execution: data.execution_performed === false ? "not_performed" : "not_reported",
  };
}

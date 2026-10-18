import { createHash } from "node:crypto";
import { marketingMessageSchema, type EvidenceKind, type MarketingAction, type MarketingEvaluation } from "./schemas.js";
import { evidenceFreshnessMs } from "./sources.js";

export function messageFingerprint(message: MarketingAction["message"]): string {
  // Parsing gives a fixed key order independent of the caller's JSON formatting.
  return createHash("sha256").update(JSON.stringify(marketingMessageSchema.parse(message))).digest("hex");
}

export function inspectEvidence(input: MarketingAction, now: Date, fingerprint: string): MarketingEvaluation["evidence_checks"] {
  return (Object.keys(evidenceFreshnessMs) as EvidenceKind[]).map((kind) => {
    const record = input.evidence[kind];
    const base = { kind, reference: record?.reference ?? null, source: record?.source ?? null, observed_at: record?.observed_at ?? null };
    if (!record) return { ...base, status: "MISSING", detail: `Supply evidence.${kind} from the relevant system or reviewer.` };
    if (record.status === "unavailable") return { ...base, status: "UNAVAILABLE", detail: `The ${kind} source was unavailable; its facts are unknown.` };
    const recipientBound = kind === "permission" || kind === "suppression" || kind === "subscriber";
    const messageBound = kind === "content_review" || kind === "permission" || kind === "unsubscribe";
    if (record.sender_id !== input.sender.id || (recipientBound && record.recipient_id !== input.recipient.id)
      || (messageBound && record.message_sha256 !== fingerprint)) {
      return { ...base, status: "SCOPE_MISMATCH", detail: `The ${kind} record must match this sender${recipientBound ? ", recipient" : ""}${messageBound ? ", and exact message_sha256" : ""}. Retrieve or review the correct evidence.` };
    }
    const observed = Date.parse(record.observed_at);
    const referenceTime = Math.max(now.getTime(), Date.parse(input.planned_send_at));
    if (observed > now.getTime() + 300_000 || referenceTime - observed > evidenceFreshnessMs[kind]) {
      return { ...base, status: "STALE", detail: `Refresh ${kind} evidence near the planned send. Freshness is an application threshold (${evidenceFreshnessMs[kind] / 60_000} minutes), not a legal expiry of the original permission.` };
    }
    return { ...base, status: "CURRENT", detail: "Supplied evidence matches this assessment and its freshness threshold; the source has not been independently authenticated." };
  });
}

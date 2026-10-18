import { MarketingContext } from "./context.js";
import { inspectEvidence, messageFingerprint } from "./evidence.js";
import { checkCanada, checkUK, checkUS } from "./policies.js";
import { marketingInputSchema, marketingEvaluationSchema, type MarketingInput, type MarketingEvaluation } from "./schemas.js";
import { policyPacks, sources } from "./sources.js";

export function checkMarketingEmail(raw: MarketingInput, now = new Date()): MarketingEvaluation {
  const input = marketingInputSchema.parse(raw);
  const fingerprint = messageFingerprint(input.message);
  const evidenceChecks = inspectEvidence(input, now, fingerprint);
  const ctx = new MarketingContext(input, evidenceChecks);
  const countries = [...new Set([input.recipient.country, input.sender.country, ...(input.dispatch_country ? [input.dispatch_country] : [])])];
  const supported = countries.filter((code): code is keyof typeof policyPacks => Object.hasOwn(policyPacks, code));
  const unsupported = countries.filter((code) => !Object.hasOwn(policyPacks, code));
  const app = "marketing-evidence";
  if (Date.parse(input.planned_send_at) < now.getTime() - 15 * 60_000) ctx.add(app, "past_send_time", "Historical send time", "REVIEW",
    "The planned send is in the past; present-day source reads cannot establish historical consent and suppression state.",
    "Supply contemporaneous records and obtain a historical assessment, or set the intended future send time and refresh evidence.", null, [], "assessment_input");
  if (!input.dispatch_country) ctx.add(app, "dispatch_country", "Sending location", "MISSING", "The sending location is unknown.",
    "Supply dispatch_country and establish jurisdictional applicability.", null, [], "assessment_input");
  if (unsupported.length) ctx.add(app, "country_coverage", "Additional jurisdiction coverage", "REVIEW", `No marketing pack is implemented for ${unsupported.join(", ")}.`,
    "Obtain a separate assessment for the unsupported jurisdiction(s).", null, [], "assessment_input");
  if (countries.length > 1) ctx.add(app, "cross_border", "Cross-border applicability and exceptions", "REVIEW",
    "Candidate packs are combined from recipient, sender and dispatch locations. Exact territorial applicability and cross-border exceptions are not automatically determined.",
    "Confirm which jurisdictions and any cross-border exceptions apply before relying on the combined findings.", countries.includes("CA") ? sources.caScope.url : null, [], "assessment_input");
  const commercial = input.message.kind === "commercial";
  if (!commercial) ctx.add(app, "message_scope", "Message classification", "REVIEW", `The ${input.message.kind} message classification is outside this commercial-email MVP.`,
    "Have a reviewer classify the actual content and establish the applicable rules, including any charitable, mixed-message or transactional exceptions.", null, [], "assessment_input");
  if (!input.message.subject.trim() || !input.message.text.trim()) ctx.add(app, "draft_content", "Rendered email content", "MISSING",
    "The subject or rendered plain-text body is empty.", "Supply the full rendered draft, including the footer.", null, [], "assessment_input");
  const suppression = ctx.evidence("suppression", app, "suppression_evidence", "Current recipient suppression search", null);
  if (suppression) {
    ctx.add(app, "suppression_sources", "All configured suppression sources checked", suppression.all_sources_checked === true ? "SATISFIED" : "MISSING",
      suppression.all_sources_checked === true ? "The supplied search reports complete configured-source coverage." : "The suppression search is incomplete; unchecked sources remain unknown.",
      "Check the email platform and relevant internal suppression/preferences records.", null, ["suppression"], "assessment_input");
    ctx.flag(app, "suppression", "Recipient not suppressed", suppression.suppressed === undefined ? undefined : !suppression.suppressed,
      "Exclude the suppressed recipient. Resolve any later permission through a fresh reviewed record; do not silently clear an opt-out.", null, ["suppression"]);
  }
  if (evidenceChecks.find((item) => item.kind === "permission")?.status === "CURRENT" && input.evidence.permission?.withdrawn === true) {
    ctx.add(app, "withdrawal", "Recipient withdrawal", "FAILED", "The supplied permission evidence reports an email-marketing withdrawal.",
      "Exclude this recipient and reconcile the permission and suppression records.", null, ["permission"], "application_policy");
  }
  if (commercial) for (const country of supported) ({ US: checkUS, CA: checkCanada, GB: checkUK })[country](ctx);
  const requirements = ctx.findings;
  const decision: MarketingEvaluation["decision"] = requirements.some((item) => item.status === "FAILED") ? "BLOCK"
    : requirements.some((item) => item.status === "MISSING") ? "NEEDS_EVIDENCE"
    : requirements.some((item) => item.status === "REVIEW") ? "REVIEW" : "NO_BLOCKERS_FOUND";
  const summary = {
    BLOCK: "Hold this email: the supplied draft or evidence shows a failed condition. Apply the proposed fixes or exclude the recipient, then recheck.",
    NEEDS_EVIDENCE: "Hold this email while missing, stale or unavailable evidence is retrieved. Unknown evidence is not a confirmed failure or permission to send.",
    REVIEW: "A reviewer must resolve the stated applicability, classification or coverage gaps before proceeding.",
    NO_BLOCKERS_FOUND: "No blockers were found within the implemented checks and supplied evidence. This is not independent verification or authorization to send.",
  }[decision];
  const corrections: MarketingEvaluation["proposed_corrections"] = [];
  const profileCurrent = evidenceChecks.find((item) => item.kind === "sender_profile")?.status === "CURRENT";
  if (requirements.some((item) => item.id.endsWith(".postal_address") && item.status === "FAILED")
    && profileCurrent && input.evidence.sender_profile?.postal_address_confirmed === true && input.sender.postal_address) {
    corrections.push({ field: "message.text", value: input.sender.postal_address, reason: "Proposed footer addition using the postal address confirmed by the supplied sender-profile record. Recheck the revised message." });
  }
  const unsubscribeCurrent = evidenceChecks.find((item) => item.kind === "unsubscribe")?.status === "CURRENT";
  if (requirements.some((item) => item.id.endsWith(".unsubscribe_present") && item.status === "FAILED") && unsubscribeCurrent
    && input.evidence.unsubscribe?.functional === true && input.evidence.unsubscribe.target) {
    corrections.push({ field: "message.text", value: `Unsubscribe: ${input.evidence.unsubscribe.target}`, reason: "Proposed opt-out addition from supplied operational evidence. Recheck the new draft and its evidence fingerprint." });
  }
  const sourceList: MarketingEvaluation["sources"] = supported.flatMap((country) => [...policyPacks[country].sources]);
  if (requirements.some((item) => item.source_url === sources.usStatute.url)) sourceList.push(sources.usStatute);
  return marketingEvaluationSchema.parse({
    assessed_at: now.toISOString(), policy_version: "marketing/1.0.0", scope: "Selected US CAN-SPAM, Canada CASL and UK PECR commercial-email checks using caller-supplied evidence. No email is authorized or sent.",
    action: { action_type: "marketing_email", sender_id: input.sender.id, recipient_id: input.recipient.id, recipient_country: input.recipient.country,
      subject: input.message.subject, planned_send_at: input.planned_send_at },
    message_sha256: fingerprint, decision, summary,
    routing: { policy_id: "marketing-email", kind: "composed", reason: `Candidate packs: ${supported.map((code) => policyPacks[code].title).join(", ") || "none"}; based on recipient, sender and dispatch locations.` },
    coverage: { checked_policies: commercial ? supported.map((code) => policyPacks[code].id) : [], unsupported_countries: unsupported, full_coverage: false,
      limitations: [
        "All evidence is supplied by the caller. Provenance labels and review flags are not independently authenticated; no live CRM, consent, email-platform or unsubscribe request is made.",
        "Subject accuracy, identity disclosures, consent scope and product similarity use explicit supplied review evidence bound to the exact message hash; they are not inferred by a language model.",
        "This MVP covers selected commercial-email conditions only. UK GDPR, other privacy/consumer rules, charitable messages and specialized exemptions require separate review.",
        "Canadian express consent has no automatic time limit here. Only selected purchase (24 calendar months) and inquiry (6 calendar months) implied-consent routes are implemented.",
        "Evidence freshness thresholds are application settings, not legal expiry periods. Recheck the exact final message and refresh suppression near the actual send.",
      ] },
    requirements, missing_information: requirements.filter((item) => item.status === "MISSING").map((item) => ({ field: item.id, reason: item.detail })),
    remediation_plan: requirements.filter((item) => item.status !== "SATISFIED").map((item) => ({ requirement_id: item.id,
      owner: item.status === "REVIEW" ? "human" : "agent", instruction: ctx.instructions.get(item.id)! })),
    proposed_corrections: corrections, evidence_checks: evidenceChecks,
    sources: [...new Map(sourceList.map((source) => [source.url, source])).values()],
    advisory_only: true, can_proceed_under_checked_rules: false, execution_performed: false, live_lookup_performed: false,
  });
}

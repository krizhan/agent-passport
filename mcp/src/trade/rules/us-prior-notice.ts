import type { Condition, LegalSource, RuleCheck, TradeInput, TradeRule } from "../types.js";
import { check, sameProduct } from "./checks.js";

const source = (section: string, title: string): LegalSource => ({ title,
  url: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-I/section-${section}`,
  verified_as_of: "2026-10-17", verification_status: "verified_guidance" });
const scopeSource = source("1.277", "21 CFR 1.277: prior-notice scope and exclusions");
const timingSource = source("1.279", "21 CFR 1.279: FDA confirmation and filing windows");
const scope: Condition = { all: [
  { field: "to_country", op: "eq", value: "US" },
  { field: "technical_specifications.food_type", op: "eq", value: "packaged_roasted_coffee" },
  { field: "shipment.purpose", op: "eq", value: "commercial_sale" },
  { field: "shipment.transport_mode", op: "in", value: ["air", "sea"] },
] };
const base = { version: "1.0.0", jurisdiction: "US", direction: "import", categories: ["food_agriculture"],
  transaction_types: ["shipment", "reexport"], required_inputs: [], required_documents: [], remediation_steps: [],
} as const;

function calendarDay(timestamp: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86400000;
}

function noticeEvidence(input: TradeInput, plannedDate: string): RuleCheck {
  const notice = input.prior_notice;
  const missing = [!input.shipment?.id && "shipment.id", !notice?.confirmation_number && "prior_notice.confirmation_number",
    !notice?.evidence_reference && "prior_notice.evidence_reference"].filter((field): field is string => Boolean(field));
  const type = "fda_prior_notice_confirmation";
  const referenced = input.documents.map((document, index) => ({ document, index })).filter(({ document }) => document.reference === notice?.evidence_reference);
  const evidence_refs = referenced.map(({ document }) => document.reference);
  const required_documents = [type];
  const review = [{ owner: "human" as const, instruction: "Resolve the mismatched prior-notice record using the actual product, shipment and filing confirmation, then recheck." }];
  if (referenced.some(({ document }) => document.type !== type || (document.product && !sameProduct(document.product, input.product))
    || (document.shipment_id && input.shipment?.id && document.shipment_id !== input.shipment.id))) {
    return check("REVIEW", "PRIOR_NOTICE_EVIDENCE_MISMATCH", "The selected record has a conflicting document type, product, or shipment identifier.",
      { evidence_refs, required_documents, remediation_steps: review });
  }
  const arrivalDay = input.shipment?.arrival_at && input.shipment.arrival_timezone
    ? calendarDay(input.shipment.arrival_at, input.shipment.arrival_timezone) : Date.parse(plannedDate) / 86400000;
  if (!referenced.length || referenced.some(({ document }) => document.expires_on && Date.parse(document.expires_on) / 86400000 < arrivalDay)) missing.push("documents");
  for (const { document, index } of referenced) {
    if (!document.product) missing.push(`documents.${index}.product`);
    if (!document.shipment_id) missing.push(`documents.${index}.shipment_id`);
  }
  if (missing.length) return check("MISSING", "PRIOR_NOTICE_EVIDENCE_MISSING", "Supply a current confirmation reference bound to this exact product and shipment. Missing bindings cannot be inferred.", {
    missing_fields: [...new Set(missing)], evidence_refs, required_documents,
    remediation_steps: [{ owner: "agent", instruction: "Ask the importer or broker for the actual FDA confirmation and its product/shipment bindings; supply the referenced document and recheck." }],
  });
  return check("SATISFIED", "PRIOR_NOTICE_REFERENCE_RECORDED", "The caller supplied a product/shipment-matching confirmation reference. Authenticity, filing contents, FDA acceptance and import clearance remain unverified.",
    { evidence_refs, required_documents, remediation_steps: [{ owner: "human", instruction: "Validate the actual confirmation, filing contents and any amendments with the importer or broker." }] });
}

export const usPriorNoticeRules: readonly TradeRule[] = [
  { ...base, id: "US-IMPORT-COFFEE-NOTICE-SCOPE", title: "Establish the modeled coffee prior-notice scope",
    conditions: { field: "to_country", op: "eq", value: "US" }, finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "The detailed workflow covers declared packaged_roasted_coffee for commercial sale arriving by air or sea. Other contexts remain under the broader FDA applicability review.",
    sources: [scopeSource],
    assess(input) {
      const facts = [
        ["technical_specifications.food_type", input.technical_specifications?.food_type, ["packaged_roasted_coffee"]],
        ["shipment.purpose", input.shipment?.purpose, ["commercial_sale"]],
        ["shipment.transport_mode", input.shipment?.transport_mode, ["air", "sea"]],
      ] as const;
      if (facts.some(([, value, allowed]) => typeof value === "string" && value !== "unknown" && !(allowed as readonly string[]).includes(value))) {
        return check("REVIEW", "FOOD_CONTEXT_OUTSIDE_MODELED_SCOPE", "This food type, purpose, or transport mode is outside the detailed coffee workflow. No prior-notice exemption is inferred.", {
          remediation_steps: [{ owner: "human", instruction: "Determine the actual FDA applicability and filing requirements for this food and shipment context." }],
        });
      }
      const missing_fields = facts.filter(([, value]) => typeof value !== "string" || value === "unknown").map(([field]) => field);
      if (missing_fields.length) return check("MISSING", "FOOD_SHIPMENT_CONTEXT_MISSING", "Establish the food type, shipment purpose and transport mode before requesting detailed filing evidence.", {
        missing_fields, remediation_steps: [{ owner: "agent", instruction: "Obtain the exact food type, purpose and transport mode; do not assume an exemption." }],
      });
      return check("SATISFIED", "PRIOR_NOTICE_APPLIES", "The declared commercial packaged-roasted-coffee air/sea shipment is within the modeled prior-notice scope.");
    },
  },
  { ...base, id: "US-IMPORT-COFFEE-NOTICE-EVIDENCE", title: "Bind the prior-notice reference to the product and shipment",
    conditions: scope, finding: "DOCUMENT_REQUIRED", explanation: "Collect a product/shipment-matching FDA prior-notice confirmation record.",
    sources: [scopeSource, timingSource], assess: (input, { plannedDate }) => noticeEvidence(input, plannedDate),
  },
  { ...base, id: "US-IMPORT-COFFEE-NOTICE-WINDOW", title: "Check the FDA prior-notice filing window",
    conditions: scope, finding: "HUMAN_REVIEW_REQUIRED", explanation: "Check actual FDA confirmation and arrival times against transport and submission-method windows.",
    sources: [timingSource],
    assess(input, { now }) {
      const notice = input.prior_notice;
      const shipment = input.shipment;
      const missing_fields = [!notice?.confirmed_at && "prior_notice.confirmed_at", !notice?.submission_method && "prior_notice.submission_method",
        !shipment?.arrival_at && "shipment.arrival_at", !shipment?.arrival_timezone && "shipment.arrival_timezone"].filter((field): field is string => Boolean(field));
      if (missing_fields.length) return check("MISSING", "PRIOR_NOTICE_TIMING_MISSING", "Obtain the actual confirmation time, submission method, first-U.S.-port arrival time and port time zone.", {
        missing_fields, remediation_steps: [{ owner: "agent", instruction: "Obtain the actual FDA and shipment timestamps and the first U.S. port's IANA time zone; then recheck." }],
      });
      const confirmed = Date.parse(notice!.confirmed_at!);
      const arrival = Date.parse(shipment!.arrival_at!);
      if (confirmed > now.getTime() || arrival <= now.getTime()) return check("REVIEW", "SHIPMENT_TIMESTAMPS_REQUIRE_REVIEW", "The confirmation is in the future or the proposed arrival is already past. Establish the actual pre-arrival facts.", {
        remediation_steps: [{ owner: "human", instruction: "Resolve the confirmation and arrival timestamps using actual records before rechecking." }],
      });
      const minimumHours = shipment!.transport_mode === "air" ? 4 : 8;
      const maximumDays = notice!.submission_method === "pnsi" ? 15 : 30;
      const hours = (arrival - confirmed) / 3600000;
      const days = calendarDay(shipment!.arrival_at!, shipment!.arrival_timezone!) - calendarDay(notice!.confirmed_at!, shipment!.arrival_timezone!);
      if (hours < minimumHours || days > maximumDays) return check("FAILED", "PRIOR_NOTICE_OUTSIDE_FILING_WINDOW", "The supplied confirmation fails the modeled minimum lead time or maximum calendar-day filing window for this arrival.", {
        remediation_steps: [{ owner: "human", instruction: "Hold the shipment. Have the importer or broker establish a lawful arrival/filing arrangement using actual records, then recheck." }],
      });
      return check("SATISFIED", "PRIOR_NOTICE_WITHIN_FILING_WINDOW", `The supplied timestamps satisfy the modeled ${minimumHours}-hour minimum and ${maximumDays}-calendar-day maximum in ${shipment!.arrival_timezone}. This does not verify the filing or clear the shipment.`);
    },
  },
];

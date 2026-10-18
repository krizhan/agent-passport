import { z } from "zod";
import { countrySchema } from "../countries.js";

const text = z.string().trim().min(1).max(500);
const date = z.iso.datetime({ offset: true });
const hash = z.string().regex(/^[a-f0-9]{64}$/, "Use the SHA-256 returned as message_sha256 by a check.");
const flag = z.boolean().optional();
const meta = z.object({
  reference: text,
  source: text.describe("Origin of this supplied record, such as CRM, consent store, or synthetic demo. Not independently authenticated."),
  observed_at: date.describe("When the record was retrieved or reviewed, distinct from the original consent/event date."),
  status: z.enum(["available", "unavailable"]),
  sender_id: text,
  recipient_id: text.optional(),
  message_sha256: hash.optional(),
}).strict();

export const marketingMessageSchema = z.object({
  subject: z.string().max(500),
  from_name: z.string().max(500),
  from_email: z.email(),
  reply_to: z.email().optional(),
  text: z.string().max(100_000).describe("The actual rendered plain-text part, including its footer. An empty draft can be assessed."),
  html: z.string().max(150_000).optional(),
  kind: z.enum(["commercial", "mixed", "transactional", "charitable", "unknown"]),
  purpose: text,
  unsubscribe: z.object({ method: z.enum(["url", "reply"]), target: text }).strict().optional(),
}).strict();

export const marketingInputSchema = z.object({
  sender: z.object({ id: text, name: text, country: countrySchema, postal_address: text.optional(), contact: text.optional() }).strict(),
  dispatch_country: countrySchema.optional().describe("Where the message will be sent from; unknown location remains an evidence gap."),
  recipient: z.object({ id: text, country: countrySchema, subscriber_type: z.enum(["individual", "corporate", "unknown"]) }).strict(),
  message: marketingMessageSchema,
  planned_send_at: date,
  evidence: z.object({
    sender_profile: meta.extend({ identity_confirmed: flag, postal_address_confirmed: flag, contact_confirmed: flag, contact_valid_until: date.optional() }).optional(),
    content_review: meta.extend({ reviewed_by: text.optional(), headers_accurate: flag, subject_accurate: flag, ad_identification_present: flag,
      sender_identification_present: flag, opt_out_clear: flag, own_similar_products: flag }).optional(),
    permission: meta.extend({
      basis: z.enum(["express_consent", "implied_purchase", "implied_inquiry", "soft_opt_in", "solicited", "exemption", "none"]),
      channel: z.literal("email"), covers_message: flag, withdrawn: flag, granted_at: date.optional(), expires_at: date.optional(),
      qualifying_event_at: date.optional(), collected_directly: flag, during_sale_or_negotiation: flag, opt_out_at_collection: flag,
      all_records_checked: flag, explanation: text.optional(),
      collection_method: text.optional(), consent_text: z.string().max(10_000).optional(),
      affirmative_action: flag, specific_and_informed: flag, freely_given: flag,
    }).optional(),
    suppression: meta.extend({ suppressed: flag, all_sources_checked: flag }).optional(),
    unsubscribe: meta.extend({ target: text.optional(), functional: flag, simple: flag, free: flag, no_login_required: flag,
      all_marketing_opt_out: flag, available_until: date.optional(), max_processing_business_days: z.number().int().min(0).max(365).optional(),
      processes_without_delay: flag }).optional(),
    subscriber: meta.extend({ subscriber_type: z.enum(["individual", "corporate", "unknown"]) }).optional(),
  }).strict().default({}),
}).strict();

export const legalSourceSchema = z.object({ title: z.string(), url: z.url(), reviewed_as_of: z.string() });
export const marketingRequirementSchema = z.object({
  id: z.string(), policy_id: z.string(), title: z.string(),
  status: z.enum(["SATISFIED", "FAILED", "MISSING", "REVIEW"]),
  basis: z.enum(["legal_readiness", "assessment_input", "application_policy"]),
  detail: z.string(), source_url: z.url().nullable(), evidence_references: z.array(z.string()),
});

export const marketingEvaluationSchema = z.object({
  assessed_at: date, policy_version: z.string(), scope: z.string(),
  action: z.object({ action_type: z.literal("marketing_email"), sender_id: z.string(), recipient_id: z.string(), recipient_country: countrySchema,
    subject: z.string(), planned_send_at: date }),
  message_sha256: hash,
  decision: z.enum(["BLOCK", "NEEDS_EVIDENCE", "REVIEW", "NO_BLOCKERS_FOUND"]), summary: z.string(),
  routing: z.object({ policy_id: z.string(), kind: z.literal("composed"), reason: z.string() }),
  coverage: z.object({ checked_policies: z.array(z.string()), unsupported_countries: z.array(z.string()), full_coverage: z.literal(false), limitations: z.array(z.string()) }),
  requirements: z.array(marketingRequirementSchema),
  missing_information: z.array(z.object({ field: z.string(), reason: z.string() })),
  remediation_plan: z.array(z.object({ requirement_id: z.string(), owner: z.enum(["agent", "human"]), instruction: z.string() })),
  proposed_corrections: z.array(z.object({ field: z.string(), value: z.string(), reason: z.string() })),
  evidence_checks: z.array(z.object({ kind: z.string(), reference: z.string().nullable(), source: z.string().nullable(), observed_at: date.nullable(),
    status: z.enum(["CURRENT", "MISSING", "UNAVAILABLE", "STALE", "SCOPE_MISMATCH"]), detail: z.string() })),
  sources: z.array(legalSourceSchema),
  advisory_only: z.literal(true), can_proceed_under_checked_rules: z.literal(false), execution_performed: z.literal(false), live_lookup_performed: z.literal(false),
});

export type MarketingInput = z.input<typeof marketingInputSchema>;
export type MarketingAction = z.infer<typeof marketingInputSchema>;
export type MarketingEvaluation = z.infer<typeof marketingEvaluationSchema>;
export type MarketingRequirement = z.infer<typeof marketingRequirementSchema>;
export type EvidenceKind = keyof MarketingAction["evidence"];

import { z } from "zod";
import { countrySchema } from "../countries.js";
import { requirementResultSchema, screeningInputSchema, stepSchema } from "../schemas.js";
import { screeningResultSchema } from "../screening/schemas.js";

const text = z.string().trim().min(1).max(1000);
const date = z.iso.date();
export const productCategories = ["general_goods", "food_agriculture", "medical", "chemicals", "wildlife", "waste",
  "dual_use", "advanced_computing", "encryption", "military", "nuclear", "rare_earth", "chewing_gum", "electronic_cigarette"] as const;
export const tradeInputSchema = z.object({
  product: text.describe("Product/model or software/technology being transferred. A description alone does not establish classification."),
  from_country: countrySchema.describe("Shipping/exporting country; separate from manufacturing origin."),
  to_country: countrySchema,
  origin_country: countrySchema.optional(),
  transit_countries: z.array(countrySchema).max(8).default([]),
  transaction_type: z.enum(["shipment", "reexport", "technology_transfer", "transit"]).default("shipment"),
  planned_date: date.optional().describe("Planned transaction date; defaults to assessment date. Effective intervals use this date."),
  product_category: z.enum(productCategories).optional().describe("Caller-supplied scenario category. Not a verified legal classification."),
  hs_code: z.string().trim().regex(/^\d{6}(?:\d{2})?(?:\d{2})?$/, "Use 6, 8, or 10 digits without punctuation.").optional(),
  control_classification: text.optional().describe("ECCN/EAR99, EU/UK control entry, SCOMET, DSGL, or other national classification."),
  classification_evidence: text.optional().describe("Manufacturer or qualified reviewer evidence supporting the supplied classification."),
  technical_specifications: z.record(z.string().min(1).max(100), z.union([text, z.number().finite(), z.boolean()])).optional(),
  end_user: text.optional(),
  end_use: text.optional(),
  end_use_flags: z.array(z.enum(["military", "wmd", "nuclear", "surveillance", "diversion", "forced_labor"])).max(6).optional(),
  parties: z.array(screeningInputSchema.extend({
    role: z.enum(["exporter", "importer", "consignee", "end_user", "intermediary", "other"]),
  }).strict()).max(10).default([]),
  ownership: z.object({ blocked_ownership_percent: z.number().min(0).max(100), evidence: text.optional() }).strict().optional(),
  quantity: z.number().positive().finite().optional(),
  value: z.number().nonnegative().finite().optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  shipment: z.object({
    id: text.optional(),
    purpose: z.enum(["commercial_sale", "personal_use", "sample", "transit", "other", "unknown"]).optional(),
    transport_mode: z.enum(["air", "sea", "road", "rail", "international_mail", "unknown"]).optional(),
    arrival_at: z.iso.datetime({ offset: true }).optional(),
    arrival_timezone: text.refine((value) => {
      try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
    }, "Use an IANA time zone for the first U.S. port of arrival.").optional(),
  }).strict().optional(),
  prior_notice: z.object({
    confirmation_number: text.optional(), confirmed_at: z.iso.datetime({ offset: true }).optional(),
    submission_method: z.enum(["pnsi", "abi_ace"]).optional(),
    evidence_reference: text.optional().describe("Reference of the fda_prior_notice_confirmation document for this product and shipment; not authenticated."),
  }).strict().optional(),
  documents: z.array(z.object({ type: z.string().trim().min(1).max(100), reference: text, expires_on: date.optional(),
    product: text.optional(), shipment_id: text.optional(),
  }).strict()).max(30).default([]),
}).strict();

export const ruleCheckSchema = z.object({
  status: z.enum(["SATISFIED", "MISSING", "FAILED", "REVIEW"]), reason_code: z.string().min(1), detail: z.string().min(1),
  missing_fields: z.array(z.string()), evidence_refs: z.array(z.string()), required_documents: z.array(z.string()),
  remediation_steps: z.array(z.object({ owner: z.enum(["agent", "human"]), instruction: z.string().min(1) })),
}).strict();

export const legalSourceSchema = z.object({
  title: z.string(), url: z.url(), verified_as_of: date.nullable(),
  verification_status: z.enum(["verified_guidance", "reference_only"]),
});
const direction = z.enum(["import", "export", "transit", "screening", "general"]);
const finding = z.object({
  rule_id: z.string(), rule_version: z.string(), jurisdiction: z.string(), direction,
  title: z.string(), code: z.enum(["PROHIBITED", "LICENSE_REQUIRED", "GENERAL_AUTHORIZATION_POSSIBLE", "DOCUMENT_REQUIRED",
    "QUOTA_REQUIRED", "RESTRICTED_PARTY_REVIEW", "END_USE_REVIEW", "CLASSIFICATION_REQUIRED", "HUMAN_REVIEW_REQUIRED"]),
  condition_status: z.enum(["MATCHED", "UNKNOWN"]), detail: z.string(), missing_fields: z.array(z.string()),
  required_documents: z.array(z.string()), sources: z.array(legalSourceSchema),
  check: ruleCheckSchema.optional(),
});
export const tradeEvaluationSchema = z.object({
  action: tradeInputSchema.extend({ action_type: z.literal("import_export") }),
  assessed_at: z.iso.datetime(), planned_date: date, policy_version: z.string(),
  decision: z.enum(["BLOCK", "NEEDS_EVIDENCE", "REVIEW", "NO_BLOCKERS_FOUND"]), summary: z.string(), scope: z.string(),
  advisory_only: z.literal(true), can_proceed_under_checked_rules: z.literal(false), execution_performed: z.literal(false),
  routing: z.object({ policy_id: z.literal("hardcoded-trade"), kind: z.literal("composed"), reason: z.string() }),
  findings: z.object({ import: z.array(finding), export: z.array(finding), transit: z.array(finding), screening: z.array(finding), general: z.array(finding) }),
  rule_evaluations: z.array(z.object({ rule_id: z.string(), rule_version: z.string(), jurisdiction: z.string(), direction,
    outcome: z.enum(["MATCHED", "NOT_MATCHED", "UNKNOWN", "NOT_EFFECTIVE"]), missing_fields: z.array(z.string()) })),
  coverage: z.object({
    scope: z.literal("scenario_level"), full_transaction_coverage: z.literal(false), rule_packs: z.array(z.string()),
    checked_jurisdictions: z.array(z.string()), evaluated_rule_count: z.number().int().nonnegative(),
    unsupported: z.array(z.object({ country: z.string(), direction, reason: z.string() })), limitations: z.array(z.string()),
  }),
  missing_information: z.array(z.object({ field: z.string(), reason: z.string(), rule_ids: z.array(z.string()) })),
  required_documents: z.array(z.object({ type: z.string(), status: z.enum(["MISSING", "PROVIDED_UNVERIFIED", "EXPIRED"]),
    references: z.array(z.string()), rule_ids: z.array(z.string()) })),
  requirements: z.array(requirementResultSchema), remediation_plan: z.array(stepSchema), sources: z.array(legalSourceSchema),
  screening: z.array(z.object({ party_name: z.string(), party_role: z.string(), result: screeningResultSchema })),
});
export type TradeEvaluation = z.infer<typeof tradeEvaluationSchema>;

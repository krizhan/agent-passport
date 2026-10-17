import { z } from "zod";
import { countrySchema } from "./countries.js";

const text = z.string().trim().min(1).max(500);
const timestamp = z.iso.datetime({ offset: true });
export const actionTypeSchema = z.enum(["purchase", "marketing_email"]);
export const productCategorySchema = z.enum(["chewing_gum", "electronic_cigarette", "food", "other", "unknown"]);
export const evidenceSchema = z.object({
  id: text,
  type: z.enum(["product_specification", "hsa_approval", "medicinal_licence", "fda_prior_notice", "other"]),
  reference: z.string().trim().min(1).max(2000).describe("Caller-supplied document reference; not fetched or authenticated"),
  product: text.describe("Product described by this evidence; must match the purchase product"),
  shipment_id: text.optional(),
}).strict();
export const productFactsSchema = z.object({
  gum_type: z.enum(["ordinary", "oral_dental", "medicinal", "unknown"]).optional(),
  hsa_approval_claimed: z.boolean().optional(),
  licensed_medicine_claimed: z.boolean().optional().describe("Whether an Indian Drugs and Cosmetics Act licence is claimed; absence is unknown"),
  contains_nicotine: z.boolean().optional().describe("Nicotine-free devices can still fall within the Indian prohibition"),
  food_type: z.enum(["packaged_roasted_coffee", "other", "unknown"]).optional(),
  prior_notice: z.object({
    confirmation_number: text.optional(), confirmed_at: timestamp.optional(),
    submission_method: z.enum(["pnsi", "abi_ace"]).optional(), evidence_id: text.optional(),
  }).strict().optional(),
}).strict();
export const shipmentSchema = z.object({
  id: text.optional(),
  purpose: z.enum(["commercial_sale", "personal_use", "sample", "transit", "other", "unknown"]).optional(),
  transport_mode: z.enum(["air", "sea", "road", "rail", "international_mail", "unknown"]).optional(),
  arrival_at: timestamp.optional().describe("Anticipated arrival at the first US port, with a UTC offset"),
  arrival_timezone: text.refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }, "Supply a valid IANA time zone of the first US port, such as America/New_York").optional(),
}).strict();
export const purchaseSchema = z.object({
  action_type: z.literal("purchase").default("purchase"),
  product: text.describe("Product being imported; category and facts are supplied separately"),
  from_country: countrySchema.describe("Shipping country as an assigned ISO 3166-1 alpha-2 code; not manufacturing origin"),
  to_country: countrySchema.describe("Import destination as an assigned ISO 3166-1 alpha-2 code"),
  amount: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER).optional().describe("Optional transaction context; no value threshold or spending check"),
  origin_country: countrySchema.optional().describe("Optional manufacturing origin; origin-specific restrictions are unassessed"),
  product_category: productCategorySchema.optional().describe("Declare from product specifications; missing or unknown classification cannot pass"),
  product_facts: productFactsSchema.optional(), shipment: shipmentSchema.optional(),
  evidence: z.array(evidenceSchema).max(20).optional(),
}).strict().superRefine((input, context) => {
  const allowed: Record<string, readonly string[]> = {
    chewing_gum: ["gum_type", "hsa_approval_claimed"],
    electronic_cigarette: ["licensed_medicine_claimed", "contains_nicotine"],
    food: ["food_type", "prior_notice"],
  };
  for (const key of Object.keys(input.product_facts ?? {})) {
    if (!(allowed[input.product_category ?? ""] ?? []).includes(key)) context.addIssue({
      code: "custom", path: ["product_facts", key], message: "This fact does not belong to the declared product_category.",
    });
  }
  const seen = new Set<string>();
  input.evidence?.forEach((item, index) => {
    if (seen.has(item.id)) context.addIssue({ code: "custom", path: ["evidence", index, "id"], message: "Evidence IDs must be unique." });
    seen.add(item.id);
  });
});
export const marketingEmailSchema = z.object({
  action_type: z.literal("marketing_email"),
  recipient_country: countrySchema.describe("Submit one action per recipient country/territory"),
  recipient_count: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(), purpose: text.optional(),
}).strict();
export const actionSchema = z.discriminatedUnion("action_type", [purchaseSchema, marketingEmailSchema]);

// MCP requires an object root. Branch schemas enforce action-specific fields.
export const requestSchema = z.object({
  action_type: actionTypeSchema.default("purchase"),
  product: purchaseSchema.shape.product.optional(), from_country: purchaseSchema.shape.from_country.optional(),
  to_country: purchaseSchema.shape.to_country.optional(), amount: purchaseSchema.shape.amount,
  origin_country: purchaseSchema.shape.origin_country, product_category: purchaseSchema.shape.product_category,
  product_facts: purchaseSchema.shape.product_facts, shipment: purchaseSchema.shape.shipment, evidence: purchaseSchema.shape.evidence,
  recipient_country: marketingEmailSchema.shape.recipient_country.optional(),
  recipient_count: marketingEmailSchema.shape.recipient_count, purpose: marketingEmailSchema.shape.purpose,
}, { error: (issue) => issue.code === "unrecognized_keys" && issue.keys.includes("budget")
  ? "budget is no longer supported. Supply product and shipment facts for international regulatory checks." : undefined,
}).strict().superRefine((input, context) => {
  if (context.issues.length) return;
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) for (const issue of parsed.error.issues) context.addIssue({ ...issue });
});
export const requirementSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(),
  basis: z.enum(["assessment_input", "legal_readiness"]), source_url: z.url().nullable(),
  legal_reference: z.string().nullable().default(null), source_reviewed_at: z.iso.date().nullable().default(null),
  required_fields: z.array(z.string()).default([]),
});
export const requirementStatusSchema = z.enum(["SATISFIED", "MISSING", "FAILED", "REVIEW", "NOT_APPLICABLE"]);
export const stepSchema = z.object({
  requirement_id: z.string(),
  kind: z.enum(["stop_action", "request_information", "collect_evidence", "request_review", "recheck_action", "reschedule_or_refile"]),
  owner: z.enum(["agent", "human"]), instruction: z.string(), required_fields: z.array(z.string()).default([]),
  evidence_types: z.array(evidenceSchema.shape.type).default([]),
});
export const ruleResultSchema = z.object({
  requirement_id: z.string(), status: requirementStatusSchema, reason_code: z.string().min(1), detail: z.string().min(1),
  missing_fields: z.array(z.string()).default([]), evidence_refs: z.array(z.string()).default([]), actions: z.array(stepSchema).default([]),
}).strict();
export const requirementResultSchema = requirementSchema.extend({
  status: requirementStatusSchema, reason_code: z.string(), detail: z.string(),
  missing_fields: z.array(z.string()), evidence_refs: z.array(z.string()),
});
export const routingSchema = z.union([
  z.object({ policy_id: z.string(), kind: z.enum(["destination_specific", "general"]), reason: z.string() }),
  z.object({ policy_id: z.null(), kind: z.literal("unsupported"), reason: z.string() }),
]);
export const coverageSchema = z.object({
  status: z.enum(["partial", "none"]), evaluated_rule_ids: z.array(z.string()),
  unassessed_topics: z.array(z.string()), evidence_assurance: z.literal("caller_supplied"),
});
const contextSchema = z.object({
  policy_version: z.string(), scope: z.string(), action: actionSchema, purchase: purchaseSchema.optional(),
  advisory_only: z.literal(true), routing: routingSchema,
});
export const requirementsResponseSchema = contextSchema.extend({
  supported: z.boolean(), requirements: z.array(requirementSchema), coverage: coverageSchema,
});
export const evaluationSchema = contextSchema.extend({
  assessed_at: z.iso.datetime(), decision: z.enum(["BLOCK", "NEEDS_EVIDENCE", "REVIEW", "CHECKS_PASSED"]),
  summary: z.string(), requirements: z.array(requirementResultSchema), remediation_plan: z.array(stepSchema), coverage: coverageSchema,
  // Deprecated compatibility flag: this server never authorizes execution.
  can_proceed_under_checked_rules: z.literal(false), execution_performed: z.literal(false),
});
export type Purchase = z.infer<typeof purchaseSchema>;
export type MarketingEmail = z.infer<typeof marketingEmailSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Routing = z.infer<typeof routingSchema>;
export type CheckInput = z.input<typeof requestSchema>;
export type Requirement = z.input<typeof requirementSchema>;
export type RequirementResult = z.infer<typeof requirementResultSchema>;
export type RuleResult = z.infer<typeof ruleResultSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export function parseAction(raw: CheckInput): Action {
  return actionSchema.parse(requestSchema.parse(raw));
}

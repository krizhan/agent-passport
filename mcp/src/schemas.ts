import { z } from "zod";
import { countrySchema } from "./countries.js";

const text = z.string().trim().min(1).max(500);

export const marketingInputSchema = z.object({
  recipient_country: countrySchema.describe("Recipient country/territory as an assigned ISO 3166-1 alpha-2 code. Submit a separate check for each country."),
  recipient_count: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional()
    .describe("Optional marketing-email recipient count; a positive integer"),
  purpose: text.optional().describe("Optional campaign purpose or context"),
}).strict();

export const marketingEmailSchema = marketingInputSchema.extend({
  action_type: z.literal("marketing_email"),
});

export const purchaseInputSchema = z.object({
  product: text.describe("Required for purchase: what you want to purchase"),
  from_country: countrySchema.describe("Required for purchase: shipping country/territory as an assigned ISO 3166-1 alpha-2 code, such as US or GB. Whitespace and lowercase are normalized; UK and XK are rejected."),
  to_country: countrySchema.describe("Required for purchase: destination country/territory as an assigned ISO 3166-1 alpha-2 code, such as US or GB. Whitespace and lowercase are normalized; UK and XK are rejected."),
}).strict();

export const purchaseSchema = purchaseInputSchema.extend({
  action_type: z.literal("purchase"),
});

const partyName = z.string().trim().min(2).max(200)
  .refine((value) => (value.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2,
    "Supply a name with at least two letters or numbers.");

export const screeningInputSchema = z.object({
  name: partyName.describe("Person or organization to screen against the U.S. Consolidated Screening List"),
  aliases: z.array(partyName).max(10).default([]).describe("Additional known names or spellings; all are screened"),
  country: countrySchema.optional().describe("Optional party country. Used as context, never to exclude name matches."),
  address: text.optional().describe("Optional address for a human to compare with candidate records; not an automatic identity check"),
}).strict();

export const restrictedPartySchema = screeningInputSchema.extend({
  action_type: z.literal("restricted_party_screening"),
});

export const actionSchema = z.discriminatedUnion("action_type", [purchaseSchema, marketingEmailSchema, restrictedPartySchema]);

// The selected tool identifies the workflow; only internal actions carry a type.
export const requestSchema = purchaseInputSchema;

export const requirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  basis: z.enum(["assessment_input", "legal_readiness"]),
  source_url: z.url().nullable(),
});

export const requirementResultSchema = requirementSchema.extend({
  status: z.enum(["SATISFIED", "MISSING", "FAILED", "REVIEW"]),
  detail: z.string(),
});

export const stepSchema = z.object({
  requirement_id: z.string(),
  owner: z.enum(["agent", "human"]),
  instruction: z.string(),
});

export const routingSchema = z.union([
  z.object({
    policy_id: z.string(),
    kind: z.enum(["destination_specific", "general", "list_screening"]),
    reason: z.string(),
  }),
  z.object({
    policy_id: z.null(),
    kind: z.literal("unsupported"),
    reason: z.string(),
  }),
]);

const contextSchema = z.object({
  policy_version: z.string(),
  scope: z.string(),
  action: actionSchema,
  purchase: purchaseSchema.optional(),
  advisory_only: z.literal(true),
  routing: routingSchema,
});

export const requirementsResponseSchema = contextSchema.extend({
  supported: z.boolean(),
  requirements: z.array(requirementSchema),
});

export const evaluationSchema = contextSchema.extend({
  assessed_at: z.iso.datetime(),
  decision: z.enum(["BLOCK", "NEEDS_EVIDENCE", "REVIEW"]),
  summary: z.string(),
  requirements: z.array(requirementResultSchema),
  remediation_plan: z.array(stepSchema),
  can_proceed_under_checked_rules: z.literal(false),
  execution_performed: z.literal(false),
});

export const marketingEvaluationSchema = evaluationSchema.extend({ action: marketingEmailSchema });

export type Purchase = z.infer<typeof purchaseSchema>;
export type MarketingEmail = z.infer<typeof marketingEmailSchema>;
export type MarketingInput = z.input<typeof marketingInputSchema>;
export type ScreeningInput = z.input<typeof screeningInputSchema>;
export type RestrictedParty = z.infer<typeof restrictedPartySchema>;
export type Action = z.infer<typeof actionSchema>;
export type Routing = z.infer<typeof routingSchema>;
export type CheckInput = z.input<typeof requestSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type RequirementResult = z.infer<typeof requirementResultSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

export function parseAction(raw: CheckInput): Purchase {
  const input = requestSchema.parse(raw);
  return purchaseSchema.parse({ ...input, action_type: "purchase" });
}

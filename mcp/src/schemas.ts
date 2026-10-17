import { z } from "zod";

const text = z.string().trim().min(1).max(500);
const country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const money = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const actionSchema = z.object({
  action_type: text.describe("Proposed action type; currently supports cross_border_purchase"),
  ship_from_country: country,
  destination_country: country,
  country_of_origin: country.optional(),
  supplier_id: text.optional(),
  sku: text.optional(),
  product_description: text.optional(),
  quantity: z.number().int().positive().max(1_000_000).optional(),
  amount_minor: money.optional().describe("Purchase total in integer minor currency units"),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  budget_minor: money.optional().describe("Your optional purchase budget, in the same currency and units as amount_minor"),
}).strict();

export const requestSchema = z.object({
  action: actionSchema.describe("Your purchase context. No default purchase or scenario is supplied."),
  evidence: z.array(z.object({
    requirement_id: z.enum(["origin_documentation", "tariff_classification"]),
    reference: text.describe("Your document URL, file ID, or other reference; submission does not verify its contents"),
  }).strict()).max(20).optional(),
}).strict();

export const requirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  basis: z.enum(["assessment_input", "legal_readiness", "purchase_constraint"]),
  source_url: z.url().nullable(),
});

export const requirementResultSchema = requirementSchema.extend({
  status: z.enum(["SATISFIED", "MISSING", "FAILED", "REVIEW"]),
  detail: z.string(),
  references: z.array(z.string()),
});

export const stepSchema = z.object({
  requirement_id: z.string(),
  owner: z.enum(["agent", "human"]),
  instruction: z.string(),
});

const contextSchema = z.object({
  policy_version: z.string(),
  scope: z.string(),
  action: actionSchema,
  advisory_only: z.literal(true),
});

export const requirementsResponseSchema = contextSchema.extend({
  supported: z.boolean(),
  requirements: z.array(requirementSchema),
});

export const evaluationSchema = contextSchema.extend({
  assessed_at: z.iso.datetime(),
  decision: z.enum(["READY", "BLOCK", "NEEDS_EVIDENCE", "REVIEW"]),
  summary: z.string(),
  requirements: z.array(requirementResultSchema),
  remediation_plan: z.array(stepSchema),
  can_proceed_under_checked_rules: z.boolean(),
  execution_performed: z.literal(false),
});

export type Action = z.infer<typeof actionSchema>;
export type CheckInput = z.input<typeof requestSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type RequirementResult = z.infer<typeof requirementResultSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

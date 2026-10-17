import { z } from "zod";

const text = z.string().trim().min(1).max(500);
const country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const money = z.number().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const requestSchema = z.object({
  product: text.describe("What you want to purchase"),
  from_country: country.describe("Shipping country, as a two-letter country code"),
  to_country: country.describe("Destination country, as a two-letter country code"),
  amount: money.optional().describe("Optional purchase total, in the same currency and units as budget"),
  budget: money.optional().describe("Optional spending limit, in the same currency and units as amount; zero is allowed"),
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
});

export const stepSchema = z.object({
  requirement_id: z.string(),
  owner: z.enum(["agent", "human"]),
  instruction: z.string(),
});

export const routingSchema = z.union([
  z.object({
    policy_id: z.string(),
    kind: z.enum(["destination_specific", "general"]),
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
  purchase: requestSchema,
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

export type Purchase = z.infer<typeof requestSchema>;
export type Routing = z.infer<typeof routingSchema>;
export type CheckInput = z.input<typeof requestSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type RequirementResult = z.infer<typeof requirementResultSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

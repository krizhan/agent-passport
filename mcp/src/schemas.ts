import { z } from "zod";
import { countrySchema } from "./countries.js";

const text = z.string().trim().min(1).max(500);
const money = z.number().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const actionTypeSchema = z.enum(["purchase", "marketing_email"]);

export const purchaseSchema = z.object({
  action_type: z.literal("purchase").default("purchase"),
  product: text.describe("Required for purchase: what you want to purchase"),
  from_country: countrySchema.describe("Required for purchase: shipping country/territory as an assigned ISO 3166-1 alpha-2 code, such as US or GB. Whitespace and lowercase are normalized; UK and XK are rejected."),
  to_country: countrySchema.describe("Required for purchase: destination country/territory as an assigned ISO 3166-1 alpha-2 code, such as US or GB. Whitespace and lowercase are normalized; UK and XK are rejected."),
  amount: money.optional().describe("Optional purchase total, in the same currency and units as budget"),
  budget: money.optional().describe("Optional spending limit, in the same currency and units as amount; zero is allowed"),
}).strict();

export const marketingEmailSchema = z.object({
  action_type: z.literal("marketing_email"),
  recipient_country: countrySchema.describe("Required for marketing_email: recipient country/territory as an assigned ISO 3166-1 alpha-2 code. Submit a separate action for each recipient country."),
  recipient_count: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional()
    .describe("Optional marketing-email recipient count; a positive integer"),
  purpose: text.optional().describe("Optional marketing-email campaign purpose or context"),
}).strict();

export const actionSchema = z.discriminatedUnion("action_type", [purchaseSchema, marketingEmailSchema]);

// MCP tool schemas have an object root. Branch schemas enforce each action's
// required fields and reject fields belonging to another action type at runtime.
export const requestSchema = z.object({
  action_type: actionTypeSchema.default("purchase")
    .describe("Choose purchase or marketing_email. Defaults to purchase for existing clients. Purchase requires product, from_country, and to_country; marketing_email requires recipient_country."),
  product: purchaseSchema.shape.product.optional(),
  from_country: purchaseSchema.shape.from_country.optional(),
  to_country: purchaseSchema.shape.to_country.optional(),
  amount: purchaseSchema.shape.amount,
  budget: purchaseSchema.shape.budget,
  recipient_country: marketingEmailSchema.shape.recipient_country.optional(),
  recipient_count: marketingEmailSchema.shape.recipient_count,
  purpose: marketingEmailSchema.shape.purpose,
}).strict().superRefine((input, context) => {
  // Supplied field values were checked above; do not report their errors twice.
  if (context.issues.length) return;
  const result = actionSchema.safeParse(input);
  if (!result.success) {
    for (const issue of result.error.issues) context.addIssue({ ...issue });
  }
});

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

export type Purchase = z.infer<typeof purchaseSchema>;
export type MarketingEmail = z.infer<typeof marketingEmailSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Routing = z.infer<typeof routingSchema>;
export type CheckInput = z.input<typeof requestSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type RequirementResult = z.infer<typeof requirementResultSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

export function parseAction(raw: CheckInput): Action {
  return actionSchema.parse(requestSchema.parse(raw));
}

import { z } from "zod";
import { countrySchema } from "../countries.js";
import { tradeEvaluationSchema, tradeInputSchema } from "../trade/schemas.js";

const note = z.string().trim().max(1000);
export const foodImportShipmentSchema = tradeInputSchema.extend({
  from_country: countrySchema.refine((country) => country !== "US", "Use a non-US shipping country for this import form."),
  to_country: countrySchema.default("US").refine((country) => country === "US", "This form covers food imported into the United States."),
  product_category: z.literal("food_agriculture").default("food_agriculture"),
  transaction_type: z.enum(["shipment", "reexport"]).default("shipment"),
});

/** These are supplied statements and references, never authenticated evidence. */
const evidenceFieldsSchema = z.object({
  origin_country: z.union([countrySchema, z.literal("")]),
  manufacturer: note,
  food_type: note,
  intended_food_use: note,
  plant_material: z.enum(["unknown", "yes", "no"]),
  hs_code: z.union([tradeInputSchema.shape.hs_code.unwrap(), z.literal("")]),
  classification_evidence: note,
  commercial_invoice_reference: note,
  classification_record_reference: note,
  customs_classification_record_reference: note,
  food_applicability_reference: note,
  prior_notice_status: z.enum(["unknown", "not_provided", "provided", "not_applicable"]),
  prior_notice_reference: note,
  prior_notice_exemption_basis: note,
}).strict();

function validatePriorNotice(value: { prior_notice_status?: string; prior_notice_reference?: string; prior_notice_exemption_basis?: string }, context: z.RefinementCtx) {
  if (value.prior_notice_status === "provided" && !value.prior_notice_reference) {
    context.addIssue({ code: "custom", path: ["prior_notice_reference"], message: "Provide the filing confirmation reference." });
  }
  if (value.prior_notice_status === "not_applicable" && !value.prior_notice_exemption_basis) {
    context.addIssue({ code: "custom", path: ["prior_notice_exemption_basis"], message: "Provide the exemption or non-applicability basis for review." });
  }
}

export const foodImportEvidenceSchema = evidenceFieldsSchema.superRefine(validatePriorNotice);

export const openFoodImportReviewInputSchema = z.object({ shipment: foodImportShipmentSchema }).strict();
export const submitFoodImportReviewInputSchema = openFoodImportReviewInputSchema.extend({
  evidence: evidenceFieldsSchema.partial().superRefine(validatePriorNotice),
});

export const foodImportReviewSchema = z.object({
  phase: z.enum(["opened", "rechecked"]),
  workflow_status: z.enum(["WAITING_FOR_EVIDENCE", "READY_FOR_REVIEW", "REVIEW_REQUIRED"]),
  shipment: foodImportShipmentSchema,
  evidence: foodImportEvidenceSchema,
  assessment: tradeEvaluationSchema,
  prior_notice_review: z.object({
    status: z.enum(["UNKNOWN", "NOT_PROVIDED", "PROVIDED_UNVERIFIED", "NOT_APPLICABLE_ASSERTED"]),
    reference: z.string().nullable(),
    exemption_basis: z.string().nullable(),
    next_step: z.string(),
  }),
  limitations: z.array(z.string()),
});

export type FoodImportEvidence = z.output<typeof foodImportEvidenceSchema>;
export type FoodImportShipment = z.output<typeof foodImportShipmentSchema>;
export type FoodImportReview = z.output<typeof foodImportReviewSchema>;

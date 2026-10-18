import { checkImportExport } from "../trade/evaluate.js";
import {
  foodImportEvidenceSchema, foodImportReviewSchema, foodImportShipmentSchema,
  openFoodImportReviewInputSchema, submitFoodImportReviewInputSchema,
  type FoodImportEvidence, type FoodImportReview, type FoodImportShipment,
} from "./schemas.js";

function initialEvidence(shipment: FoodImportShipment): FoodImportEvidence {
  const facts = shipment.technical_specifications ?? {};
  const suppliedText = (key: string) => typeof facts[key] === "string" ? facts[key] : "";
  return foodImportEvidenceSchema.parse({
    origin_country: shipment.origin_country ?? "",
    manufacturer: suppliedText("manufacturer"), food_type: suppliedText("food_type"),
    intended_food_use: suppliedText("intended_food_use"),
    plant_material: facts.plant_material === true ? "yes" : facts.plant_material === false ? "no" : "unknown",
    hs_code: shipment.hs_code ?? "", classification_evidence: shipment.classification_evidence ?? "",
    commercial_invoice_reference: "", classification_record_reference: "", customs_classification_record_reference: "",
    food_applicability_reference: "", prior_notice_status: "unknown", prior_notice_reference: "", prior_notice_exemption_basis: "",
  });
}

function addEvidence(shipment: FoodImportShipment, evidence: FoodImportEvidence): FoodImportShipment {
  const technical = { ...shipment.technical_specifications };
  for (const key of ["manufacturer", "food_type", "intended_food_use"] as const) {
    if (evidence[key]) technical[key] = evidence[key];
    else delete technical[key];
  }
  if (evidence.plant_material === "unknown") delete technical.plant_material;
  else technical.plant_material = evidence.plant_material === "yes";

  const documents = [...shipment.documents];
  const references: [string, string][] = [
    ["commercial_invoice", evidence.commercial_invoice_reference],
    ["classification_record", evidence.classification_record_reference],
    ["customs_classification_record", evidence.customs_classification_record_reference],
    ["food_import_applicability_record", evidence.food_applicability_reference],
  ];
  if (evidence.prior_notice_status === "provided") references.push(["fda_prior_notice_confirmation", evidence.prior_notice_reference]);
  for (const [type, reference] of references) {
    // Preserve original expiration dates and keep separate, conflicting records visible.
    if (reference && !documents.some((doc) => doc.type === type && doc.reference === reference)) documents.push({ type, reference });
  }
  return foodImportShipmentSchema.parse({ ...shipment,
    origin_country: evidence.origin_country || undefined, hs_code: evidence.hs_code || undefined,
    classification_evidence: evidence.classification_evidence || undefined,
    technical_specifications: technical, documents,
  });
}

async function review(shipment: FoodImportShipment, evidence: FoodImportEvidence, phase: FoodImportReview["phase"], signal?: AbortSignal): Promise<FoodImportReview> {
  const assessment = await checkImportExport(shipment, { signal });
  const status = { unknown: "UNKNOWN", not_provided: "NOT_PROVIDED", provided: "PROVIDED_UNVERIFIED", not_applicable: "NOT_APPLICABLE_ASSERTED" } as const;
  const noticePending = evidence.prior_notice_status === "unknown" || evidence.prior_notice_status === "not_provided";
  const needsEvidence = assessment.decision === "NEEDS_EVIDENCE" || noticePending;
  return foodImportReviewSchema.parse({
    phase,
    workflow_status: assessment.decision === "BLOCK" ? "REVIEW_REQUIRED" : needsEvidence ? "WAITING_FOR_EVIDENCE" : "READY_FOR_REVIEW",
    shipment: { ...shipment, planned_date: assessment.planned_date }, evidence, assessment,
    prior_notice_review: {
      status: status[evidence.prior_notice_status],
      reference: evidence.prior_notice_status === "provided" ? evidence.prior_notice_reference : null,
      exemption_basis: evidence.prior_notice_status === "not_applicable" ? evidence.prior_notice_exemption_basis : null,
      next_step: evidence.prior_notice_status === "provided"
        ? "Have the importer or broker validate the confirmation, food article, shipment, timing and any amendments. A reference is not proof of acceptance or admissibility."
        : evidence.prior_notice_status === "not_applicable"
          ? "Have the importer or broker verify the supplied non-applicability or exemption basis against the actual shipment."
          : "Ask the importer or broker to determine whether prior notice applies and supply the confirmation or a supported exemption basis. No filing requirement is established from the food category alone.",
    },
    limitations: [
      "Form entries and document references are supplied, unverified evidence. No documents are uploaded, fetched or authenticated by this form.",
      "Prior-notice evidence is a separate review checklist; it does not replace the trade catalog's broader FDA applicability assessment.",
      "No FDA lookup or filing, email, shipment, purchase, or business approval is performed. READY_FOR_REVIEW means evidence is assembled for review, not transaction clearance.",
      "This form has no durable case storage. Its returned structured result can be retained by the calling client; unsent draft edits stay in the mounted form.",
      "The underlying assessment retains all other missing facts, screening results, and unsupported import/export or transit coverage.",
    ],
  });
}

export async function openFoodImportReview(raw: unknown, signal?: AbortSignal) {
  const { shipment } = openFoodImportReviewInputSchema.parse(raw);
  return review(shipment, initialEvidence(shipment), "opened", signal);
}

export async function submitFoodImportReview(raw: unknown, signal?: AbortSignal) {
  const { shipment, evidence } = submitFoodImportReviewInputSchema.parse(raw);
  // Headless clients may send only newly collected fields; omission preserves known facts.
  // An explicit blank clears a form-managed fact back to unknown.
  const merged = foodImportEvidenceSchema.parse({ ...initialEvidence(shipment), ...evidence });
  return review(addEvidence(shipment, merged), merged, "rechecked", signal);
}

export function reviewSummary(result: FoodImportReview) {
  return `${result.phase === "opened" ? "Food-import evidence form opened" : "Food-import evidence rechecked"}: ${result.workflow_status}. Trade assessment: ${result.assessment.decision}; ${result.assessment.missing_information.length} missing inputs; ${result.assessment.required_documents.filter((doc) => doc.status !== "PROVIDED_UNVERIFIED").length} missing or expired document types. Prior notice: ${result.prior_notice_review.status}. Supplied evidence is unverified. No transaction is approved or executed.`;
}

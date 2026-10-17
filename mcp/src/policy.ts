import { evaluationSchema, requestSchema, requirementsResponseSchema, type Action, type CheckInput, type Evaluation, type Requirement, type RequirementResult } from "./schemas.js";

const POLICY_VERSION = "international-purchase/0.4.0";
const SCOPE = "Advisory international purchase readiness: input completeness, origin/classification document references, and an optional caller-supplied budget for any cross-border country pair. Country- and product-specific legal requirements, document authenticity, classification correctness, duties, sanctions, and admissibility are not verified.";
const INVOICE_SOURCE = "https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86";
const HTS_SOURCE = "https://www.usitc.gov/harmonized_tariff_information";
const HS_SOURCE = "https://www.wcoomd.org/en/topics/nomenclature/overview.aspx";

function supports(action: Action) {
  return action.action_type === "cross_border_purchase" && action.ship_from_country !== action.destination_country;
}

function definitions(action: Action): Requirement[] {
  if (!supports(action)) return [{
    id: "supported_scope", title: "International purchase scope", basis: "assessment_input", source_url: null,
    description: "Use cross_border_purchase with different shipping and destination countries. Domestic purchases and other action types require a separate policy.",
  }];
  const usImport = action.destination_country === "US";
  const result: Requirement[] = [
    {
      id: "purchase_details", title: "Purchase details", basis: "assessment_input", source_url: null,
      description: "Supply the supplier, product description, quantity, total, currency, and manufacturing origin so the purchase can be assessed.",
    },
    {
      id: "origin_documentation", title: "Origin documentation", basis: usImport ? "legal_readiness" : "assessment_input", source_url: usImport ? INVOICE_SOURCE : null,
      description: usImport
        ? "Provide a document reference supporting manufacturing origin. The cited US import-invoice rule requires origin information; this readiness check does not claim every purchase requires an origin certificate. Source reviewed 2026-10-17."
        : "Provide an origin-information reference for review. Required documents depend on the countries, product, and trade agreement; this is a readiness input, not a universal certificate requirement.",
    },
    {
      id: "tariff_classification", title: "Classification review", basis: usImport ? "legal_readiness" : "assessment_input", source_url: usImport ? HTS_SOURCE : HS_SOURCE,
      description: "Provide a classification-review reference appropriate to the destination and product. A qualified reviewer must assess it; this server does not assign HS/HTS codes or calculate duties. Source reviewed 2026-10-17.",
    },
  ];
  if (action.budget_minor !== undefined) result.push({
    id: "purchase_budget", title: "Your purchase budget", basis: "purchase_constraint", source_url: null,
    description: "Compare the submitted total with your submitted budget in the same currency. This is your purchase constraint, not a legal spending limit.",
  });
  return result;
}

function context(action: Action) {
  return { action, policy_version: POLICY_VERSION, scope: SCOPE, advisory_only: true as const };
}

export function getRequirements(raw: CheckInput) {
  const { action } = requestSchema.parse(raw);
  return requirementsResponseSchema.parse({ ...context(action), supported: supports(action), requirements: definitions(action) });
}

export function checkPurchase(raw: CheckInput, now = new Date()): Evaluation {
  const { action, evidence = [] } = requestSchema.parse(raw);
  const requirements = definitions(action).map((requirement): RequirementResult => {
    const result = (status: RequirementResult["status"], detail: string, references: string[] = []) => ({ ...requirement, status, detail, references });
    if (requirement.id === "supported_scope") return result("REVIEW", "This action is outside the international purchase scope and requires a separate policy.");
    if (requirement.id === "purchase_details") {
      const fields = ["supplier_id", "product_description", "quantity", "amount_minor", "currency", "country_of_origin"] as const;
      const missing = fields.filter((field) => action[field] === undefined);
      return missing.length ? result("MISSING", `Provide: ${missing.join(", ")}.`) : result("SATISFIED", "The required purchase fields were supplied. Their accuracy is caller-reported.");
    }
    if (requirement.id === "purchase_budget") {
      if (action.amount_minor === undefined || action.currency === undefined) return result("MISSING", "Supply a total and currency to compare with your budget.");
      return action.amount_minor > action.budget_minor!
        ? result("FAILED", "The submitted total exceeds your submitted purchase budget.")
        : result("SATISFIED", "The submitted total is within your submitted purchase budget.");
    }
    const references = [...new Set(evidence.filter((item) => item.requirement_id === requirement.id).map((item) => item.reference))];
    return references.length
      ? result("REVIEW", "Document references were supplied but have not been verified. A reviewer or trusted evidence integration must assess them.", references)
      : result("MISSING", "Supply a supporting document reference for review.");
  });
  const decision: Evaluation["decision"] = requirements.some((item) => item.status === "FAILED") ? "BLOCK"
    : requirements.some((item) => item.status === "REVIEW") ? "REVIEW"
    : requirements.some((item) => item.status === "MISSING") ? "NEEDS_EVIDENCE" : "READY";
  const remediation = requirements.filter((item) => item.status !== "SATISFIED").map((item) => ({
    requirement_id: item.id,
    owner: (item.status === "REVIEW" ? "human" : "agent") as "human" | "agent",
    instruction: item.id === "supported_scope" ? "Have a reviewer define a policy for this action and route."
      : item.id === "purchase_details" ? item.detail
      : item.id === "purchase_budget" ? (item.status === "MISSING" ? item.detail : "Revise the purchase total or obtain an appropriate budget, then submit a fresh check.")
      : item.status === "REVIEW" ? `Have a qualified reviewer verify the supplied ${item.title.toLowerCase()} and its applicability to this purchase.`
      : `Obtain a reference for ${item.title.toLowerCase()} using your existing tools, then submit it for review.`,
  }));
  const summary = {
    BLOCK: "The purchase exceeds the budget you supplied.",
    REVIEW: "Human review is required. Submitted document references are not verified approvals.",
    NEEDS_EVIDENCE: "Purchase information or supporting document references are missing.",
    READY: "All modeled requirements are satisfied.",
  }[decision];
  return evaluationSchema.parse({
    ...context(action), assessed_at: now.toISOString(), decision, summary, requirements, remediation_plan: remediation,
    can_proceed_under_checked_rules: decision === "READY", execution_performed: false,
  });
}

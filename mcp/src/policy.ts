import { evaluationSchema, requestSchema, requirementsResponseSchema, type Purchase, type CheckInput, type Evaluation, type Requirement, type RequirementResult } from "./schemas.js";

const POLICY_VERSION = "international-purchase/0.5.0";
const SCOPE = "Advisory international purchase checklist based on the product and shipping countries, plus an optional caller-supplied budget comparison. Country- and product-specific legal requirements, manufacturing origin, classifications, documents, duties, sanctions, and admissibility require external review. No purchase is authorized or executed.";
const INVOICE_SOURCE = "https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86";
const HTS_SOURCE = "https://www.usitc.gov/harmonized_tariff_information";
const HS_SOURCE = "https://www.wcoomd.org/en/topics/nomenclature/overview.aspx";

function supports(purchase: Purchase) {
  return purchase.from_country !== purchase.to_country;
}

function definitions(purchase: Purchase): Requirement[] {
  if (!supports(purchase)) return [{
    id: "supported_scope", title: "International purchase scope", basis: "assessment_input", source_url: null,
    description: "This checklist covers purchases shipped between different countries. Have a reviewer define the requirements for a domestic purchase.",
  }];
  const usImport = purchase.to_country === "US";
  const result: Requirement[] = [
    {
      id: "origin_documentation", title: "Origin documentation", basis: usImport ? "legal_readiness" : "assessment_input", source_url: usImport ? INVOICE_SOURCE : null,
      description: usImport
        ? "Have a reviewer confirm the manufacturing origin and applicable US invoice documentation. The cited rule requires origin information; this does not mean every purchase requires an origin certificate. Source reviewed 2026-10-17."
        : "Have a reviewer confirm manufacturing origin and applicable documentation for this route and product. This checklist does not impose a universal origin-certificate requirement.",
    },
    {
      id: "tariff_classification", title: "Classification review", basis: usImport ? "legal_readiness" : "assessment_input", source_url: usImport ? HTS_SOURCE : HS_SOURCE,
      description: "Have a qualified reviewer identify the applicable destination tariff classification for the product. This server does not assign HS/HTS codes or calculate duties. Source reviewed 2026-10-17.",
    },
  ];
  if (purchase.budget !== undefined) result.push({
    id: "purchase_budget", title: "Your purchase budget", basis: "purchase_constraint", source_url: null,
    description: "Compare the submitted total with your submitted budget in the same currency. This is your purchase constraint, not a legal spending limit.",
  });
  return result;
}

function context(purchase: Purchase) {
  return { purchase, policy_version: POLICY_VERSION, scope: SCOPE, advisory_only: true as const };
}

export function getRequirements(raw: CheckInput) {
  const purchase = requestSchema.parse(raw);
  return requirementsResponseSchema.parse({ ...context(purchase), supported: supports(purchase), requirements: definitions(purchase) });
}

export function checkPurchase(raw: CheckInput, now = new Date()): Evaluation {
  const purchase = requestSchema.parse(raw);
  const requirements = definitions(purchase).map((requirement): RequirementResult => {
    const result = (status: RequirementResult["status"], detail: string) => ({ ...requirement, status, detail });
    if (requirement.id === "supported_scope") return result("REVIEW", requirement.description);
    if (requirement.id === "purchase_budget") {
      if (purchase.amount === undefined) return result("MISSING", "Supply amount in the same currency and units as budget to compare them.");
      return purchase.amount > purchase.budget!
        ? result("FAILED", "The submitted total exceeds your submitted purchase budget.")
        : result("SATISFIED", "The submitted total is within your submitted purchase budget.");
    }
    return result("REVIEW", requirement.description);
  });
  const decision: Evaluation["decision"] = requirements.some((item) => item.status === "FAILED") ? "BLOCK"
    : requirements.some((item) => item.status === "MISSING") ? "NEEDS_EVIDENCE" : "REVIEW";
  const remediation = requirements.filter((item) => item.status !== "SATISFIED").map((item) => ({
    requirement_id: item.id,
    owner: (item.status === "REVIEW" ? "human" : "agent") as "human" | "agent",
    instruction: item.id === "purchase_budget" && item.status === "FAILED"
      ? "Revise the purchase amount or budget, then submit a fresh check."
      : item.detail,
  }));
  const summary = {
    BLOCK: "The purchase exceeds the budget you supplied.",
    REVIEW: supports(purchase) ? "Review the applicable origin and classification requirements before proceeding." : "A separate checklist is required for a domestic purchase.",
    NEEDS_EVIDENCE: "A purchase amount is needed to check the budget you supplied.",
  }[decision];
  return evaluationSchema.parse({
    ...context(purchase), assessed_at: now.toISOString(), decision, summary, requirements, remediation_plan: remediation,
    can_proceed_under_checked_rules: false, execution_performed: false,
  });
}

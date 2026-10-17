import { evaluationSchema, parseAction, requirementsResponseSchema, type Action, type CheckInput, type Evaluation, type Requirement, type RequirementResult } from "./schemas.js";
import type { PolicyPack } from "./policies/types.js";
import { routeAction, type PolicyRoute } from "./router/route.js";

const UNSUPPORTED_POLICY_VERSION = "international-purchase/0.5.0";
const UNSUPPORTED_SCOPE = "Domestic purchases are outside this international purchase checklist. A reviewer must define the applicable domestic requirements. No purchase is authorized or executed.";

function definitions(action: Action, policy: PolicyPack | null): Requirement[] {
  if (!policy) return [{
    id: "supported_scope", title: "International purchase scope", basis: "assessment_input", source_url: null,
    description: "This checklist covers purchases shipped between different countries. Have a reviewer define the requirements for a domestic purchase.",
  }];
  const result: Requirement[] = [...policy.requirements];
  if (action.action_type === "purchase" && action.budget !== undefined) result.push({
    id: "purchase_budget", title: "Your purchase budget", basis: "purchase_constraint", source_url: null,
    description: "Compare the submitted total with your submitted budget in the same currency. This is your purchase constraint, not a legal spending limit.",
  });
  return result;
}

function context(action: Action, route: PolicyRoute) {
  return {
    action,
    ...(action.action_type === "purchase" ? { purchase: action } : {}),
    policy_version: route.policy ? `${route.policy.id}/${route.policy.version}` : UNSUPPORTED_POLICY_VERSION,
    scope: route.policy?.scope ?? UNSUPPORTED_SCOPE,
    advisory_only: true as const,
    routing: route.routing,
  };
}

export function getRequirements(raw: CheckInput) {
  const action = parseAction(raw);
  const route = routeAction(action);
  return requirementsResponseSchema.parse({
    ...context(action, route), supported: route.policy !== null, requirements: definitions(action, route.policy),
  });
}

export function checkAction(raw: CheckInput, now = new Date()): Evaluation {
  const action = parseAction(raw);
  const route = routeAction(action);
  const requirements = definitions(action, route.policy).map((requirement): RequirementResult => {
    const result = (status: RequirementResult["status"], detail: string) => ({ ...requirement, status, detail });
    if (requirement.id === "supported_scope") return result("REVIEW", requirement.description);
    if (requirement.id === "purchase_budget" && action.action_type === "purchase") {
      if (action.amount === undefined) return result("MISSING", "Supply amount in the same currency and units as budget to compare them.");
      return action.amount > action.budget!
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
    REVIEW: action.action_type === "marketing_email"
      ? "Review the applicable recipient-permission, sender-identification, and unsubscribe requirements before sending."
      : route.policy ? "Review the applicable origin and classification requirements before proceeding." : "A separate checklist is required for a domestic purchase.",
    NEEDS_EVIDENCE: "A purchase amount is needed to check the budget you supplied.",
  }[decision];
  return evaluationSchema.parse({
    ...context(action, route), assessed_at: now.toISOString(), decision, summary, requirements, remediation_plan: remediation,
    can_proceed_under_checked_rules: false, execution_performed: false,
  });
}

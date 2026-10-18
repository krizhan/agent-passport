import { evaluationSchema, marketingInputSchema, marketingEvaluationSchema, parseAction, requirementsResponseSchema, type Action, type CheckInput, type Evaluation, type MarketingEmail, type MarketingInput, type Purchase, type Requirement, type RequirementResult } from "./schemas.js";
import type { PolicyPack } from "./policies/types.js";
import { routeAction, type PolicyRoute } from "./router/route.js";

const UNSUPPORTED_POLICY_VERSION = "international-purchase/0.6.0";
const UNSUPPORTED_SCOPE = "Domestic purchases are outside this international purchase checklist. A reviewer must define the applicable domestic requirements. No purchase is authorized or executed.";

function definitions(policy: PolicyPack | null): Requirement[] {
  if (!policy) return [{
    id: "supported_scope", title: "International purchase scope", basis: "assessment_input", source_url: null,
    description: "This checklist covers purchases shipped between different countries. Have a reviewer define the requirements for a domestic purchase.",
  }];
  return [...policy.requirements];
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
    ...context(action, route), supported: route.policy !== null, requirements: definitions(route.policy),
  });
}

export function checkAction(raw: CheckInput, now = new Date()): Evaluation {
  return evaluateAction(parseAction(raw), now);
}

export function checkMarketingEmail(raw: MarketingInput) {
  const input = marketingInputSchema.parse(raw);
  return marketingEvaluationSchema.parse(evaluateAction({ ...input, action_type: "marketing_email" }, new Date()));
}

function evaluateAction(action: Purchase | MarketingEmail, now: Date): Evaluation {
  const route = routeAction(action);
  const requirements = definitions(route.policy).map((requirement): RequirementResult => ({
    ...requirement, status: "REVIEW", detail: requirement.description,
  }));
  const remediation = requirements.map((item) => ({
    requirement_id: item.id,
    owner: "human" as const,
    instruction: item.detail,
  }));
  const summary = action.action_type === "marketing_email"
    ? "Review the applicable recipient-permission, sender-identification, and unsubscribe requirements before sending."
    : route.policy ? "Review the applicable origin and classification requirements before proceeding." : "A separate checklist is required for a domestic purchase.";
  return evaluationSchema.parse({
    ...context(action, route), assessed_at: now.toISOString(), decision: "REVIEW", summary, requirements, remediation_plan: remediation,
    can_proceed_under_checked_rules: false, execution_performed: false,
  });
}

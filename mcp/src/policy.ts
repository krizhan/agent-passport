import { evaluationSchema, parseAction, requirementSchema, requirementsResponseSchema,
  type Action, type CheckInput, type Requirement, type RequirementResult, type Step } from "./schemas.js";
import { aggregateDecision, evaluateRules } from "./engine.js";
import { routeAction, type PolicyRoute } from "./router/route.js";

const classification: Requirement = {
  id: "product_classification", title: "Declared product category", basis: "assessment_input", source_url: null,
  description: "Establish the product category from specifications. Product-name keyword matching is not regulatory classification.",
  required_fields: ["product_category"],
};
const unsupported: Requirement = {
  id: "supported_scope", title: "International trade scope", basis: "assessment_input", source_url: null,
  description: "This server covers cross-border purchases. A domestic checklist requires separate review.",
};
const coverageGap: Requirement = {
  id: "policy_coverage", title: "Product/jurisdiction coverage", basis: "assessment_input", source_url: null,
  description: "No implemented rule covers the declared category in this destination pack. A reviewer must establish the applicable requirements.",
};

function unknownCategory(action: Action) {
  return action.action_type === "purchase" && (!action.product_category || action.product_category === "unknown");
}
function definitions(action: Action, route: PolicyRoute): Requirement[] {
  if (!route.policy) return [unsupported];
  return [...(route.policy.rules?.length && unknownCategory(action) ? [classification] : []), ...route.policy.requirements];
}
function context(action: Action, route: PolicyRoute) {
  return {
    action, ...(action.action_type === "purchase" ? { purchase: action } : {}),
    policy_version: route.policy ? route.policy.id + "/" + route.policy.version : "unsupported/0.6.0",
    scope: route.policy?.scope ?? "Domestic purchases are outside the international trade scope. No action is authorized or executed.",
    advisory_only: true as const, routing: route.routing,
  };
}
function coverage(route: PolicyRoute, requirements: readonly RequirementResult[] = []) {
  const ids = new Set(route.policy?.rules?.map((rule) => rule.requirement.id));
  const evaluated = requirements.filter((item) => ids.has(item.id) && item.status !== "NOT_APPLICABLE").map((item) => item.id);
  return {
    status: evaluated.length ? "partial" as const : "none" as const, evaluated_rule_ids: evaluated,
    unassessed_topics: [...(route.policy?.unassessed_topics ?? [route.policy?.scope ?? unsupported.description])],
    evidence_assurance: "caller_supplied" as const,
  };
}
function review(requirement: Requirement, reason_code: string): RequirementResult {
  return { ...requirementSchema.parse(requirement), status: "REVIEW", reason_code, detail: requirement.description, missing_fields: [], evidence_refs: [] };
}

export function getRequirements(raw: CheckInput) {
  const action = parseAction(raw);
  const route = routeAction(action);
  return requirementsResponseSchema.parse({
    ...context(action, route), supported: route.policy !== null,
    requirements: definitions(action, route), coverage: coverage(route),
  });
}

export function checkAction(raw: CheckInput, now = new Date()) {
  const action = parseAction(raw);
  const route = routeAction(action);
  let requirements: RequirementResult[];
  let remediation: Step[];
  if (route.policy?.rules?.length) {
    const evaluated = evaluateRules(route.policy.rules, action, now);
    requirements = evaluated.requirements;
    remediation = evaluated.actions;
    if (unknownCategory(action)) {
      requirements.unshift({ ...requirementSchema.parse(classification), status: "MISSING", reason_code: "PRODUCT_CATEGORY_MISSING",
        detail: classification.description, missing_fields: ["product_category"], evidence_refs: [] });
      remediation.unshift({ requirement_id: classification.id, kind: "request_information", owner: "agent",
        instruction: "Obtain product specifications and establish product_category before rechecking.", required_fields: ["product_category"], evidence_types: ["product_specification"] });
    } else if (requirements.every((item) => item.status === "NOT_APPLICABLE")) {
      requirements.push(review(coverageGap, "PRODUCT_JURISDICTION_NOT_COVERED"));
      remediation.push({ requirement_id: coverageGap.id, kind: "request_review", owner: "human",
        instruction: coverageGap.description, required_fields: [], evidence_types: [] });
    }
  } else {
    requirements = definitions(action, route).map((item) => review(item, route.policy ? "CHECKLIST_REQUIRES_REVIEW" : "DOMESTIC_ROUTE_UNSUPPORTED"));
    remediation = requirements.map((item) => ({ requirement_id: item.id, kind: "request_review" as const, owner: "human" as const,
      instruction: item.detail, required_fields: [], evidence_types: [] }));
  }
  const decision = aggregateDecision(requirements);
  if (decision === "NEEDS_EVIDENCE" || decision === "REVIEW") {
    const unresolved = requirements.find((item) => item.status === "MISSING" || item.status === "REVIEW");
    if (unresolved) remediation.push({ requirement_id: unresolved.id, kind: "recheck_action", owner: "agent",
      instruction: "Submit the actual updated product/shipment facts and evidence to check_action after resolving these findings.", required_fields: [], evidence_types: [] });
  }
  const summary = {
    BLOCK: "A modeled regulatory prohibition or shipment condition fails. Hold the proposed action and follow the findings.",
    NEEDS_EVIDENCE: "Supply the identified product/shipment facts or evidence, then recheck.",
    REVIEW: "An exception, coverage gap, or unresolved assessment requires review before proceeding.",
    CHECKS_PASSED: "The modeled checks passed against caller-supplied facts. This is not complete import clearance or authorization to execute.",
  }[decision];
  return evaluationSchema.parse({
    ...context(action, route), assessed_at: now.toISOString(), decision, summary, requirements,
    remediation_plan: remediation, coverage: coverage(route, requirements),
    can_proceed_under_checked_rules: false, execution_performed: false,
  });
}

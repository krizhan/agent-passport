import { requirementSchema, ruleResultSchema, type Action, type Evaluation, type RequirementResult, type Step } from "./schemas.js";
import type { PolicyRule } from "./policies/types.js";
export function evaluateRules(rules: readonly PolicyRule[], action: Action, now: Date) {
  const requirements: RequirementResult[] = [];
  const actions: Step[] = [];
  for (const rule of rules) {
    const definition = requirementSchema.parse(rule.requirement);
    try {
      const evaluated = ruleResultSchema.parse(rule.evaluate(action, new Date(now)));
      if (evaluated.requirement_id !== definition.id || evaluated.actions.some((item) => item.requirement_id !== definition.id)) {
        throw new Error("Rule returned an inconsistent requirement ID");
      }
      const { actions: proposed, requirement_id: _, ...finding } = evaluated;
      requirements.push({ ...definition, ...finding });
      actions.push(...proposed);
    } catch {
      requirements.push({ ...definition, status: "REVIEW", reason_code: "RULE_EVALUATION_ERROR",
        detail: "This required rule could not be evaluated reliably. Review is required.", missing_fields: [], evidence_refs: [] });
      actions.push({ requirement_id: definition.id, kind: "request_review", owner: "human",
        instruction: "Resolve the rule evaluation error and submit a fresh assessment.", required_fields: [], evidence_types: [] });
    }
  }
  return { requirements, actions };
}
export function aggregateDecision(requirements: readonly RequirementResult[]): Evaluation["decision"] {
  if (requirements.some((item) => item.status === "FAILED")) return "BLOCK";
  if (requirements.some((item) => item.status === "MISSING")) return "NEEDS_EVIDENCE";
  if (requirements.some((item) => item.status === "REVIEW")) return "REVIEW";
  return requirements.some((item) => item.status === "SATISFIED") ? "CHECKS_PASSED" : "REVIEW";
}

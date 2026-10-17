import { ruleResultSchema, type Purchase, type RuleResult, type Step } from "../schemas.js";
export function result(requirement_id: string, status: RuleResult["status"], reason_code: string, detail: string,
  options: Partial<Pick<RuleResult, "missing_fields" | "evidence_refs" | "actions">> = {}): RuleResult {
  return ruleResultSchema.parse({ requirement_id, status, reason_code, detail, ...options });
}
export function step(requirement_id: string, kind: Step["kind"], instruction: string,
  required_fields: string[] = [], evidence_types: Step["evidence_types"] = []): Step {
  return { requirement_id, kind, owner: kind === "request_review" ? "human" : "agent", instruction, required_fields, evidence_types };
}
export function matchingEvidence(action: Purchase, type: NonNullable<Purchase["evidence"]>[number]["type"]) {
  return action.evidence?.filter((item) => item.type === type && item.product.toLowerCase() === action.product.toLowerCase()) ?? [];
}

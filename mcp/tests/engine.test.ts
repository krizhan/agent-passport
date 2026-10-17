import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateDecision, evaluateRules } from "../src/engine.js";
import { result } from "../src/policies/helpers.js";
import { requirementSchema, type RequirementResult } from "../src/schemas.js";
import { fixture, now } from "./fixtures.js";
import { parseAction } from "../src/schemas.js";
const requirement = { id: "example", title: "Example", description: "Example", basis: "assessment_input" as const, source_url: null };
function finding(status: RequirementResult["status"]): RequirementResult {
  const { actions: _, requirement_id: __, ...evaluation } = result(requirement.id, status, "EXAMPLE", "Example");
  return { ...requirementSchema.parse(requirement), ...evaluation };
}
test("aggregation keeps blocker precedence and never passes empty or entirely inapplicable rules", () => {
  assert.equal(aggregateDecision([]), "REVIEW");
  assert.equal(aggregateDecision([finding("NOT_APPLICABLE")]), "REVIEW");
  assert.equal(aggregateDecision([finding("SATISFIED"), finding("NOT_APPLICABLE")]), "CHECKS_PASSED");
  assert.equal(aggregateDecision([finding("SATISFIED"), finding("REVIEW")]), "REVIEW");
  assert.equal(aggregateDecision([finding("REVIEW"), finding("MISSING")]), "NEEDS_EVIDENCE");
  assert.equal(aggregateDecision([finding("MISSING"), finding("FAILED")]), "BLOCK");
});
test("a throwing rule is unresolved even when another required rule passes", () => {
  const evaluated = evaluateRules([
    { requirement, evaluate: () => result(requirement.id, "SATISFIED", "OK", "Passed") },
    { requirement: { ...requirement, id: "broken" }, evaluate() { throw new Error("broken implementation"); } },
  ], parseAction(fixture("sg-gum")), now);
  assert.equal(aggregateDecision(evaluated.requirements), "REVIEW");
  assert.equal(evaluated.requirements[1]?.reason_code, "RULE_EVALUATION_ERROR");
});
test("malformed rule identities cannot produce a successful assessment", () => {
  const evaluated = evaluateRules([{ requirement, evaluate: () => result("wrong", "SATISFIED", "OK", "Passed") }], parseAction(fixture("sg-gum")), now);
  assert.equal(aggregateDecision(evaluated.requirements), "REVIEW");
});

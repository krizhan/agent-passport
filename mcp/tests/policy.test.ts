import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAction, getRequirements } from "../src/policy.js";
import { evaluationSchema, parseAction, requestSchema, type CheckInput } from "../src/schemas.js";
import { fixture, now } from "./fixtures.js";
const check = (input: CheckInput) => checkAction(input, now);

test("Singapore ordinary gum is blocked with a sourced stop instruction", () => {
  const result = check(fixture("sg-gum"));
  assert.equal(result.routing.policy_id, "sg-import");
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.requirements[0]?.reason_code, "SG_GUM_PROHIBITED");
  assert.match(result.requirements[0]!.source_url!, /customs.gov.sg/);
  assert.ok(result.remediation_plan.some((item) => item.kind === "stop_action"));
  assert.equal(result.execution_performed, false);
});
test("unknown gum type asks for specifications instead of guessing from its name", () => {
  const input = fixture("sg-gum");
  input.product = "Medicinal gum with a reassuring product name";
  delete input.product_facts;
  const result = check(input);
  assert.equal(result.decision, "NEEDS_EVIDENCE");
  assert.deepEqual(result.requirements[0]?.missing_fields, ["product_facts.gum_type"]);
});
test("Singapore approved-exclusion claim collects evidence then requires review", () => {
  const input = fixture("sg-gum");
  input.product_facts = { gum_type: "medicinal", hsa_approval_claimed: true };
  assert.equal(check(input).decision, "NEEDS_EVIDENCE");
  input.evidence = [{ id: "approval", type: "hsa_approval", product: input.product!, reference: "demo://approval" }];
  const result = check(input);
  assert.equal(result.decision, "REVIEW");
  assert.deepEqual(result.requirements[0]?.evidence_refs, ["approval"]);
});
test("evidence for another product cannot establish a Singapore exception", () => {
  const input = fixture("sg-gum");
  input.product_facts = { gum_type: "oral_dental", hsa_approval_claimed: true };
  input.evidence = [{ id: "approval", type: "hsa_approval", product: "Different gum", reference: "demo://approval" }];
  assert.equal(check(input).decision, "NEEDS_EVIDENCE");
});
test("explicitly unapproved dental gum is blocked; conflicting assertions require review", () => {
  const input = fixture("sg-gum");
  input.product_facts = { gum_type: "oral_dental", hsa_approval_claimed: false };
  assert.equal(check(input).decision, "BLOCK");
  input.product_facts = { gum_type: "ordinary", hsa_approval_claimed: true };
  assert.equal(check(input).decision, "REVIEW");
});
test("India prohibits the declared consumer device even without nicotine", () => {
  const result = check(fixture("in-vape"));
  assert.equal(result.routing.policy_id, "in-import");
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.requirements[0]?.reason_code, "IN_E_CIGARETTE_PROHIBITED");
});
test("India medicinal exclusion is not assumed when information is omitted", () => {
  const input = fixture("in-vape");
  delete input.product_facts;
  assert.equal(check(input).decision, "NEEDS_EVIDENCE");
});
test("India licence claim collects product-matching evidence then requires review", () => {
  const input = fixture("in-vape");
  input.product_facts = { licensed_medicine_claimed: true };
  assert.equal(check(input).decision, "NEEDS_EVIDENCE");
  input.evidence = [{ id: "licence", type: "medicinal_licence", reference: "demo://licence", product: input.product! }];
  assert.equal(check(input).decision, "REVIEW");
});
test("US coffee missing notice returns actionable evidence requirements", () => {
  const result = check(fixture("us-coffee-missing-notice"));
  assert.equal(result.routing.policy_id, "us-import");
  assert.equal(result.decision, "NEEDS_EVIDENCE");
  assert.ok(result.requirements.some((item) => item.reason_code === "PRIOR_NOTICE_EVIDENCE_MISSING"));
  assert.ok(result.remediation_plan.some((item) => item.kind === "collect_evidence" && item.evidence_types.includes("fda_prior_notice")));
  assert.ok(result.remediation_plan.some((item) => item.kind === "recheck_action"));
});
test("US corrected confirmation resolves the scoped checks with explicit limits", () => {
  const result = check(fixture("us-coffee-notice"));
  assert.equal(result.decision, "CHECKS_PASSED");
  assert.ok(result.requirements.every((item) => item.status === "SATISFIED"));
  assert.equal(result.coverage.status, "partial");
  assert.equal(result.coverage.evidence_assurance, "caller_supplied");
  assert.equal(result.coverage.evaluated_rule_ids.length, 3);
  assert.ok(result.coverage.unassessed_topics.includes("Tariff classification, valuation and duties"));
  assert.equal(result.can_proceed_under_checked_rules, false);
  assert.equal(result.advisory_only, true);
  assert.deepEqual(result.remediation_plan, []);
  assert.deepEqual(evaluationSchema.parse(result), result);
});
for (const field of ["product", "shipment_id", "type"] as const) {
  test("US confirmation with mismatched " + field + " requires review", () => {
    const input = fixture("us-coffee-notice");
    const record = input.evidence![0]!;
    if (field === "type") record.type = "other";
    else record[field] = "different";
    assert.equal(check(input).decision, "REVIEW");
  });
}
test("an unresolved confirmation reference cannot satisfy evidence", () => {
  const input = fixture("us-coffee-notice");
  input.product_facts!.prior_notice!.evidence_id = "absent";
  assert.equal(check(input).decision, "NEEDS_EVIDENCE");
});
test("food purpose and transportation omissions remain missing, not exempt", () => {
  const input = fixture("us-coffee-notice");
  delete input.shipment!.purpose;
  delete input.shipment!.transport_mode;
  const result = check(input);
  assert.equal(result.decision, "NEEDS_EVIDENCE");
  assert.equal(result.requirements[0]?.status, "MISSING");
  assert.ok(result.requirements.slice(1).every((item) => item.status === "NOT_APPLICABLE"));
});
for (const context of ["other_food", "personal", "international_mail", "road"] as const) {
  test("unmodeled US food context " + context + " requires review", () => {
    const input = fixture("us-coffee-notice");
    if (context === "other_food") input.product_facts!.food_type = "other";
    else if (context === "personal") input.shipment!.purpose = "personal_use";
    else input.shipment!.transport_mode = context;
    assert.equal(check(input).decision, "REVIEW");
  });
}
for (const destination of ["SG", "IN", "US"] as const) {
  test("unknown category at " + destination + " requests information; uncovered category never passes", () => {
    const input: CheckInput = { product: "Unclassified goods", from_country: "VN", to_country: destination };
    assert.equal(check(input).decision, "NEEDS_EVIDENCE");
    input.product_category = "other";
    const result = check(input);
    assert.equal(result.decision, "REVIEW");
    assert.equal(result.coverage.status, "none");
    assert.ok(result.requirements.some((item) => item.reason_code === "PRODUCT_JURISDICTION_NOT_COVERED"));
  });
}
test("valid other countries, domestic routes, and marketing preserve review fallback", () => {
  for (const input of [
    { product: "Fan", from_country: "VN", to_country: "CA" },
    { product: "Gum", from_country: "SG", to_country: "SG", product_category: "chewing_gum" },
    { action_type: "marketing_email", recipient_country: "CA" },
  ] satisfies CheckInput[]) {
    assert.equal(check(input).decision, "REVIEW");
    assert.equal(check(input).coverage.status, "none");
  }
});
test("get_requirements and check_action share routing and discovery never claims evaluation", () => {
  for (const name of ["sg-gum", "in-vape", "us-coffee-missing-notice"]) {
    const requirements = getRequirements(fixture(name));
    assert.deepEqual(requirements.routing, check(fixture(name)).routing);
    assert.equal(requirements.coverage.status, "none");
    assert.ok(requirements.requirements.every((item) => item.source_url && item.source_reviewed_at));
  }
});
test("country normalization and origin remain separate; unassigned and mixed action fields reject", () => {
  const input = fixture("sg-gum");
  input.from_country = " my "; input.to_country = "sg"; input.origin_country = " cn ";
  const action = parseAction(input);
  assert.equal(action.action_type, "purchase");
  if (action.action_type === "purchase") {
    assert.equal(action.from_country, "MY"); assert.equal(action.origin_country, "CN");
  }
  for (const code of ["USA", "UK", "ZZ", "EU", "XK"]) assert.equal(requestSchema.safeParse({ ...input, to_country: code }).success, false);
  assert.equal(requestSchema.safeParse({ action_type: "marketing_email", recipient_country: "US", evidence: [] }).success, false);
  assert.equal(requestSchema.safeParse({ ...input, recipient_country: "US" }).success, false);
  assert.equal(requestSchema.safeParse({ ...input, product_facts: { food_type: "packaged_roasted_coffee" } }).success, false);
});
test("removed budget fails with migration guidance rather than being silently ignored", () => {
  const parsed = requestSchema.safeParse({ ...fixture("sg-gum"), budget: 100 });
  assert.equal(parsed.success, false);
  if (!parsed.success) assert.match(parsed.error.message, /budget is no longer supported/);
});
test("duplicate evidence IDs and caller-controlled verification assertions reject", () => {
  const input = fixture("us-coffee-notice");
  assert.equal(requestSchema.safeParse({ ...input, evidence: [input.evidence![0], input.evidence![0]] }).success, false);
  assert.equal(requestSchema.safeParse({ ...input, evidence: [{ ...input.evidence![0], verified: true }] }).success, false);
});

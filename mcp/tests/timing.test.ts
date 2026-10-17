import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAction } from "../src/policy.js";
import { fixture, now } from "./fixtures.js";

for (const [mode, minimum] of [["air", 4], ["sea", 8]] as const) {
  for (const [seconds, expected] of [[-1, "BLOCK"], [0, "CHECKS_PASSED"], [1, "CHECKS_PASSED"]] as const) {
    test(mode + " minimum lead-time boundary " + seconds + " seconds", () => {
      const input = fixture("us-coffee-notice");
      input.shipment!.transport_mode = mode;
      input.product_facts!.prior_notice!.confirmed_at = now.toISOString();
      input.shipment!.arrival_at = new Date(now.getTime() + minimum * 3600000 + seconds * 1000).toISOString();
      const result = checkAction(input, now);
      assert.equal(result.decision, expected);
      if (expected === "BLOCK") assert.ok(result.remediation_plan.some((item) => item.kind === "reschedule_or_refile"));
    });
  }
}
for (const [method, days] of [["pnsi", 15], ["abi_ace", 30]] as const) {
  for (const extraDay of [0, 1]) {
    test(method + " maximum calendar-day boundary plus " + extraDay, () => {
      const input = fixture("us-coffee-notice");
      input.product_facts!.prior_notice!.submission_method = method;
      input.product_facts!.prior_notice!.confirmed_at = now.toISOString();
      input.shipment!.arrival_at = new Date(now.getTime() + (days + extraDay) * 86400000 + 3600000).toISOString();
      assert.equal(checkAction(input, now).decision, extraDay ? "BLOCK" : "CHECKS_PASSED");
    });
  }
}
test("calendar-day comparison uses the declared port zone rather than elapsed 24-hour periods", () => {
  const input = fixture("us-coffee-notice");
  input.product_facts!.prior_notice!.confirmed_at = "2026-10-17T03:00:00Z";
  input.shipment!.arrival_at = "2026-11-01T04:00:00Z";
  input.shipment!.arrival_timezone = "America/New_York";
  assert.equal(checkAction(input, now).decision, "BLOCK");
  input.shipment!.arrival_timezone = "UTC";
  assert.equal(checkAction(input, now).decision, "CHECKS_PASSED");
});
test("future confirmations and past arrivals require review", () => {
  const input = fixture("us-coffee-notice");
  input.product_facts!.prior_notice!.confirmed_at = "2026-10-17T13:00:00Z";
  assert.equal(checkAction(input, now).decision, "REVIEW");
  input.product_facts!.prior_notice!.confirmed_at = "2026-10-16T10:00:00Z";
  input.shipment!.arrival_at = "2026-10-17T11:00:00Z";
  assert.equal(checkAction(input, now).decision, "REVIEW");
});
test("missing port zone requests information and invalid dates/zones reject", () => {
  const input = fixture("us-coffee-notice");
  delete input.shipment!.arrival_timezone;
  assert.equal(checkAction(input, now).decision, "NEEDS_EVIDENCE");
  assert.throws(() => checkAction({ ...input, shipment: { ...input.shipment, arrival_timezone: "Made/Up" } }, now));
  assert.throws(() => checkAction({ ...input, shipment: { ...input.shipment, arrival_at: "not-a-date" } }, now));
});

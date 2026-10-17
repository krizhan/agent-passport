import { readFileSync } from "node:fs";
import { checkAction } from "../src/policy.js";
import type { CheckInput } from "../src/schemas.js";
const now = new Date("2026-10-17T12:00:00Z");
console.log("Synthetic demo only; assessment time pinned to " + now.toISOString());
for (const name of ["sg-gum", "in-vape", "us-coffee-missing-notice", "us-coffee-notice"]) {
  const input: CheckInput = JSON.parse(readFileSync(new URL("../../fixtures/" + name + ".json", import.meta.url), "utf8"));
  const result = checkAction(input, now);
  console.log(JSON.stringify({ scenario: name, decision: result.decision, findings: result.requirements.map((item) => ({
    id: item.id, status: item.status, reason_code: item.reason_code, source_url: item.source_url,
  })), proposed_actions: result.remediation_plan, coverage: result.coverage }, null, 2));
}

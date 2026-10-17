import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.argv[2] ?? "http://127.0.0.1:3017/mcp";
const client = new Client({ name: "agent-passport-smoke", version: "0.6.0" }, { capabilities: {} });
const fixture = (name) => JSON.parse(readFileSync(new URL("../fixtures/" + name + ".json", import.meta.url), "utf8"));
let calls = 0;
async function call(name, input) {
  const result = await client.callTool({ name, arguments: input });
  assert.notEqual(result.isError, true);
  assert.ok(result.structuredContent);
  assert.deepEqual(JSON.parse(result.content.find((item) => item.type === "text").text), result.structuredContent);
  calls++;
  return result.structuredContent;
}
async function invalid(input) {
  try {
    const result = await client.callTool({ name: "check_action", arguments: input });
    assert.equal(result.isError, true, "Invalid input must not receive a successful assessment");
  } catch (error) {
    // Only a protocol input-validation error counts as rejection. Network and
    // output-schema failures must fail this smoke test rather than pass it.
    if (error.code !== -32602) throw error;
  }
  calls++;
}
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((item) => item.name).sort(), ["check_action", "get_remediation_plan", "get_requirements"]);
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.outputSchema);
    assert.ok(!("budget" in tool.inputSchema.properties));
  }
  for (const [name, expected] of [["sg-gum", "BLOCK"], ["in-vape", "BLOCK"], ["us-coffee-missing-notice", "NEEDS_EVIDENCE"]]) {
    const input = fixture(name);
    const assessment = await call("check_action", input);
    assert.equal(assessment.decision, expected);
    const requirements = await call("get_requirements", input);
    const remediation = await call("get_remediation_plan", input);
    assert.deepEqual(assessment.routing, requirements.routing);
    assert.deepEqual(assessment.routing, remediation.routing);
    assert.deepEqual(assessment.requirements, remediation.requirements);
    assert.deepEqual(assessment.remediation_plan, remediation.remediation_plan);
  }
  // Simulate the agent retrieving a synthetic confirmation and resubmitting it.
  const corrected = fixture("us-coffee-notice");
  const time = Date.now();
  corrected.product_facts.prior_notice.confirmed_at = new Date(time - 3600000).toISOString();
  corrected.shipment.arrival_at = new Date(time + 24 * 3600000).toISOString();
  const passed = await call("check_action", corrected);
  assert.equal(passed.decision, "CHECKS_PASSED");
  assert.equal(passed.coverage.evidence_assurance, "caller_supplied");
  assert.equal(passed.can_proceed_under_checked_rules, false);
  assert.equal(passed.execution_performed, false);
  const uncovered = await call("check_action", { product: "Unmodeled goods", from_country: "VN", to_country: "SG", product_category: "other" });
  assert.equal(uncovered.decision, "REVIEW");
  await invalid({ ...fixture("sg-gum"), budget: 100 });
  await invalid({ ...fixture("sg-gum"), to_country: "ZZ" });
  await invalid({ action_type: "marketing_email", recipient_country: "CA", product_category: "food" });
  console.log("MCP smoke passed: tools/list, " + calls + " tool calls, matching structured/text output, bans, evidence/recheck, fallback, and schema rejection.");
} finally {
  await client.close();
}

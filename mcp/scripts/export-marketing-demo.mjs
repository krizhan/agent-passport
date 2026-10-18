import { writeFile } from "node:fs/promises";
import { marketingExamples } from "../.marketing-build/src/marketing/examples.js";
import { checkMarketingEmail } from "../.marketing-build/src/marketing/evaluate.js";

const now = new Date();
const scenarios = marketingExamples(now).map((example) => ({ ...example, result: checkMarketingEmail(example.input, now) }));
await writeFile(new URL("../src/marketing/requests.json", import.meta.url), JSON.stringify({ generated_at: now.toISOString(),
  note: "Synthetic demonstration records. For fresh examples read the MCP resource marketing://examples.",
  scenarios: scenarios.map(({ result, ...example }) => example) }, null, 2) + "\n");
console.table(scenarios.map(({ id, expected_decision, result }) => ({ scenario: id, decision: result.decision, expected: expected_decision,
  blockers: result.requirements.filter((item) => item.status === "FAILED").length, missing: result.missing_information.length })));
console.log(`Exported ${scenarios.length} marketing evaluator examples. Fresh requests: marketing://examples`);

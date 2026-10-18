import { mkdir, writeFile } from "node:fs/promises";
import { checkImportExport } from "../.trade-build/src/trade/evaluate.js";
import { tradeExamples } from "../.trade-build/src/trade/examples/index.js";
import { tradeRules } from "../.trade-build/src/trade/registry.js";

const generatedAt = new Date().toISOString();
const scenarios = [];
for (const example of tradeExamples) {
  const result = await checkImportExport(example.input);
  scenarios.push({ id: example.id, title: example.title, input: example.input,
    result: { assessed_at: result.assessed_at, planned_date: result.planned_date, decision: result.decision,
      summary: result.summary, findings: Object.values(result.findings).flat(), coverage: result.coverage,
      missing_information: result.missing_information, required_documents: result.required_documents,
      remediation_plan: result.remediation_plan, sources: result.sources,
      screening: result.screening.map(({ party_name, party_role, result: screening }) => ({ party_name, party_role,
        status: screening.status, total_matches: screening.total_matches, source: screening.source,
        matches: screening.matches.slice(0, 3), error: screening.error })),
    },
  });
}
const directory = new URL("../../web/src/generated/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("trade-scenarios.json", directory), JSON.stringify({ generated_at: generatedAt,
  rule_count: tradeRules.length, scenarios }, null, 2) + "\n");
await writeFile(new URL("../src/trade/examples/requests.json", import.meta.url), JSON.stringify(tradeExamples.map(({ id, title, input }) => ({ id, title, input })), null, 2) + "\n");
console.log(`Exported ${scenarios.length} real evaluator results from ${tradeRules.length} rules for /scenarios.`);

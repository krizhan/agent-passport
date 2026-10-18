# agent-passport

International compliance tooling for AI agents.

Built for Y Combinator's [Make Something Agents Want](https://events.ycombinator.com/MakeSomethingAgentsWant) hackathon.

The initial direction is to help agents discover jurisdiction-specific compliance requirements and return structured results with links to their sources.

Project status: the [`mcp/`](./mcp/README.md) app implements three advisory purchase tools (`check_import_export`, `get_import_export_requirements`, `get_import_export_remediation_plan`) plus separate `check_marketing_email` and `screen_restricted_party` tools. Purchase calls accept `product`, `from_country`, and `to_country`. The selected tool identifies the workflow; public inputs do not accept `action_type`. Marketing evaluates one rendered email and recipient using supplied evidence against selected US CAN-SPAM, Canada CASL and UK PECR rules. The new schema replaces the country/count/purpose checklist. Read `marketing://examples` in the MCP Inspector for synthetic requests and call `check_marketing_email` to evaluate them. Screening accepts a party name and optional aliases, country, and address, screens against the official U.S. Consolidated Screening List bundled as a dated JSON snapshot, and returns possible matches, source provenance, and review steps. No backend or API key is required; screening works offline with the bundled snapshot.

The [policy router](./mcp/README.md#purchase-checks) selects a US import, general purchase, or U.S. restricted-party pack. Marketing has an independent evidence-based evaluator. Screening compares actual bundled CSL records. Results expose the snapshot date and age; stale data is flagged for refresh, while invalid or incomplete data returns `UNAVAILABLE`; no candidates is not transaction clearance. The caller remains responsible for business actions.

## Product homepage

Live website: [Agent Passport](https://vubsb6rq.insforge.site/).

The Agent Passport homepage lives in [`web/`](./web/README.md). It has four sections: overview, import/export, marketing, and restricted-party screening. Examples are illustrative. The separate `/demo` page reads real captured tool history from Manufact, showing at most the latest 10 requests per category (trade, marketing, and screening), with assessments, policy explanations, sources, and category tabs. Historical marketing requests remain readable. The demo uses server-only Manufact credentials and hides calls without captured details.

```bash
cd web
npm ci
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173/. The homepage needs no backend connection or API keys; `/demo` needs server-only Manufact credentials. See [`web/README.md`](./web/README.md) for local testing and production-build instructions.

## MCP server

Requires Node.js 22.22.2 or later.

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector to call the five tools. The server requires no backend or environment variables; screening works offline with the bundled snapshot. See [`mcp/README.md`](./mcp/README.md) for inputs, expected results, and deployment commands.

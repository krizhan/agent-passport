# agent-passport

Compliance tooling for AI agents.

Built for Y Combinator's [Make Something Agents Want](https://events.ycombinator.com/MakeSomethingAgentsWant) hackathon.

The initial direction is to help agents discover jurisdiction-specific compliance requirements and return structured results with links to their sources.

Import/export MVP: `check_import_export` combines **57 hardcoded rules** across ten jurisdiction packs with **100 example requests**, separate import/export findings, source links, evidence/document gaps and bundled U.S. screening. Checks include Singapore chewing gum, Indian electronic cigarettes, and product/shipment-bound FDA prior-notice evidence and timing for commercial roasted coffee arriving by air or sea. See the [trade tool guide](mcp/README.md#import-and-export-scenarios). The `/scenarios` gallery shows recorded evaluator outputs; `/demo` remains real gateway history. Coverage is partial and results remain advisory.

Project status: the [`mcp/`](./mcp/README.md) app provides three import/export tools (`check_import_export`, `get_import_export_requirements`, `get_import_export_remediation_plan`) plus `open_food_import_review` / `submit_food_import_review` for the food-evidence MCP App, and separate `check_marketing_email` and `screen_restricted_party` tools. The trade check accepts product and route plus optional classification, technical, party, evidence and document context; the requirement/remediation tools retain their purchase checklist inputs. The selected tool identifies the workflow; public inputs do not accept `action_type`. Marketing evaluates one rendered email and recipient using supplied evidence against selected US CAN-SPAM, Canada CASL and UK PECR rules. Read `marketing://examples` for synthetic requests. Screening accepts a party name and optional aliases, country, and address, screens against the official U.S. Consolidated Screening List bundled as a dated JSON snapshot, and returns possible matches, source provenance, and review steps. No backend or API key is required; screening works offline with the bundled snapshot.

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

Open http://localhost:3000/mcp/inspector to call the seven tools. The server requires no backend or environment variables; screening works offline with the bundled snapshot. See [`mcp/README.md`](./mcp/README.md) for inputs, expected results, and deployment commands.

For the interactive food-import evidence form, call `open_food_import_review`. Its recheck uses `submit_food_import_review`, and supporting hosts can share the submitted evidence and remaining steps with the calling agent. See the [MCP App workflow](mcp/README.md#food-import-mcp-app).

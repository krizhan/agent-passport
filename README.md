# agent-passport

International compliance tooling for AI agents.

Built for Y Combinator's [Make Something Agents Want](https://events.ycombinator.com/MakeSomethingAgentsWant) hackathon.

The initial direction is to help agents discover jurisdiction-specific compliance requirements and return structured results with links to their sources.

The [`mcp/`](./mcp/README.md) server implements three sourced regulatory workflows: Singapore chewing-gum import restrictions, India's electronic-cigarette import prohibition, and FDA prior notice for commercial packaged roasted coffee arriving in the US by air or sea. Its three advisory tools—`check_action`, `get_requirements`, and `get_remediation_plan`—return findings, required evidence, coverage gaps, and proposed actions.

The [router](./mcp/src/router/route.ts) selects a destination pack; the [engine](./mcp/src/engine.ts) evaluates its rules against declared product/shipment facts and caller-supplied evidence. Unknown categories, uncovered contexts, and claimed exceptions remain unresolved. `CHECKS_PASSED` applies only to the modeled checks and does not authorize a purchase or establish complete import clearance. Budget checks have been removed. Marketing and other trade routes remain review checklists.

## Product homepage

Live website: [Agent Passport](https://vubsb6rq.insforge.site/).

The Agent Passport homepage lives in [`web/`](./web/README.md). It has three sections: an international compliance overview, import/export checks, and marketing requirements. There is no navigation bar; examples are illustrative.

```bash
cd web
npm ci
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173/. No backend connection or API keys are required. See [`web/README.md`](./web/README.md) for local testing and production-build instructions.

## MCP server

Requires Node.js 22.22.2 or later.

```bash
cd mcp
npm install
npm test
npm run demo
npm run dev
```

Open http://localhost:3000/mcp/inspector to call the tools. No backend or environment variables are required. See [`mcp/README.md`](./mcp/README.md) for inputs, expected results, and deployment instructions.

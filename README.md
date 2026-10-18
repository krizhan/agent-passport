# agent-passport

International compliance tooling for AI agents.

Built for Y Combinator's [Make Something Agents Want](https://events.ycombinator.com/MakeSomethingAgentsWant) hackathon.

The initial direction is to help agents discover jurisdiction-specific compliance requirements and return structured results with links to their sources.

Project status: the [`mcp/`](./mcp/README.md) app implements three advisory tools—`check_action`, `get_requirements`, and `get_remediation_plan`—for international purchases and marketing emails. Each accepts an `action_type`: `purchase` uses `product`, `from_country`, and `to_country`, with an optional amount and budget; `marketing_email` uses `recipient_country`, with optional recipient count and purpose. Existing inputs without an action type default to purchase. The server returns readiness requirements, available reference links, and next steps; the calling agent executes through its own tools.

The [policy router](./mcp/README.md#policy-routing) selects a US import, general international purchase, or general marketing review pack and explains the selection in every tool response. Each pack stores metadata, requirements, and sources in separate files under `mcp/src/policies/`; domestic purchases return an unsupported routing result and request review. Marketing currently uses a general checklist requiring human review rather than a country-specific legal implementation.

## Product homepage

Live website: [Agent Passport](https://vubsb6rq.insforge.site/).

The Agent Passport homepage lives in [`web/`](./web/README.md). It has three sections: an international compliance overview, import/export checks, and marketing requirements. Homepage examples are illustrative. An outlined **Demo** button at the top right opens `/demo`, which shows the latest 10 captured requests per category (marketing and import/export) from Manufact, with advisory results, recorded policy explanations, source links, and simple category tabs. The demo uses server-only Manufact credentials and hides calls without captured details.

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

Open http://localhost:3000/mcp/inspector to call the tools. No backend or environment variables are required. See [`mcp/README.md`](./mcp/README.md) for inputs, expected results, and deployment instructions.

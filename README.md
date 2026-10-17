# agent-passport

International compliance tooling for AI agents.

Built for Y Combinator's [Make Something Agents Want](https://events.ycombinator.com/MakeSomethingAgentsWant) hackathon.

The initial direction is to help agents discover jurisdiction-specific compliance requirements and return structured results with links to their sources.

Project status: [`mcp/`](./mcp/README.md) implements three advisory tools—`get_requirements`, `check_action`, and `get_remediation_plan`—for international purchases. Each takes `product`, `from_country`, and `to_country`, with an optional amount and budget.

The [policy router](./mcp/README.md#policy-routing) selects a US import pack or a general international purchase pack and explains the selection in every tool response. Each pack stores metadata, requirements, and sources in separate files under `mcp/src/policies/`; domestic purchases return an unsupported routing result and request review.

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
npm run dev
```

Open http://localhost:3000/mcp/inspector to call the tools. No backend or environment variables are required. See [`mcp/README.md`](./mcp/README.md) for inputs, expected results, and deployment instructions.

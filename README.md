# agent-passport

International compliance tooling for AI agents.

Built for Y Combinator's [Make Something Agents Want](https://events.ycombinator.com/MakeSomethingAgentsWant) hackathon.

The initial direction is to help agents discover jurisdiction-specific compliance requirements and return structured results with links to their sources.

Project status: [`mcp/`](./mcp/README.md) implements three advisory tools—`get_requirements`, `check_action`, and `get_remediation_plan`—for international purchases. Each takes `product`, `from_country`, and `to_country`, with an optional amount and budget.

## MCP server

Requires Node.js 22.22.2 or later.

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector to call the tools. No backend or environment variables are required. See [`mcp/README.md`](./mcp/README.md) for inputs, expected results, and deployment instructions.

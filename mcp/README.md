# Customs · Agent Passport

Three advisory MCP tools for international purchases, built with mcp-use v2. Each takes just a product and two countries. No backend, environment variables, or frontend setup is required.

| Tool | Purpose |
| --- | --- |
| `get_requirements` | List the modeled requirements and source links for your action and route. |
| `check_action` | Return review needs and compare an optional purchase amount with your budget. |
| `get_remediation_plan` | Run the same check and return next steps for the agent or a human. |

## Run and test

Requires Node.js 22.22.2 or later. From the repository root:

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector and call each tool with the same three fields:

```json
{
  "product": "Your product",
  "from_country": "DE",
  "to_country": "GB"
}
```

Use your own product and two-letter shipping/destination country codes. Any pair of different countries uses the international checklist. Country codes are normalized to uppercase; validation currently checks their format rather than membership in a country registry.

Optionally add `amount` and `budget` to the same object for a spending check. Both are nonnegative numbers in the same currency and units; decimals and a zero budget are allowed. No currency conversion is performed. There is no action wrapper, action type, or document-reference array.

If port 3000 is busy, run `npm run dev -- --port 3011` and open http://localhost:3011/mcp/inspector. Tool results include the complete JSON in both text and structured content.

## Policy behavior

- Product and route → REVIEW, with origin and classification checks for a human reviewer.
- Amount above your submitted budget → BLOCK.
- Budget supplied without amount → NEEDS_EVIDENCE, asking for the amount.
- Domestic route → REVIEW, requesting a separate checklist.
- Invalid or missing required fields → input validation error.

Decision precedence is BLOCK > NEEDS_EVIDENCE > REVIEW. Responses echo the normalized purchase, requirement statuses, next steps, policy version, scope, and timestamp. Origin and classification are review tasks, not fields to fill in. This MVP does not issue READY or authorize/execute purchases.

For US-bound purchases, source links include [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information). Other destinations receive [WCO Harmonized System background](https://www.wcoomd.org/en/topics/nomenclature/overview.aspx) for classification and no US-specific rules. Sources reviewed 2026-10-17. Accepting a route means the general readiness checks apply; the server does not resolve country- or product-specific legal requirements or determine actual classifications, duties, admissibility, sanctions, or complete import/export compliance.

## Code and checks

The implementation has three core files:

- `index.ts`: registers the three tools.
- `src/schemas.ts`: input/output validation and TypeScript types.
- `src/policy.ts`: requirements, decisions, sources, and remediation.

```bash
npm run typecheck
npm run build
npm start
```

Stop any process on the same port before running `npm start`, or use `npm start -- --port 3003`. Production Inspector is optional: add `--with-inspector`.

## Manufact deployment

- MCP endpoint: https://bold-cloud-g95ht.run.mcp-use.com/mcp
- Management dashboard: https://manufact.com/cloud/org-312cbb99-5qvf5/servers/ff38bb29-7976-4069-84af-c3c190735e2d/overview

Redeploy from this directory:

```bash
npx -y mcp-use@latest deploy --no-github -y
```

Follow the deployment until running. Local environment files and generated build files are excluded from Git.

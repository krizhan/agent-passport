# Customs · Agent Passport

Three advisory MCP tools for Vietnam-to-US purchases, built with mcp-use v2. Supply your own purchase details and optional document references. No backend, environment variables, or frontend setup is required.

| Tool | Purpose |
| --- | --- |
| `get_requirements` | List the modeled requirements and source links for your action and route. |
| `check_action` | Identify missing purchase information, document-review needs, and an optional budget failure. |
| `get_remediation_plan` | Run the same check and return next steps for the agent or a human. |

## Run and test

Requires Node.js 22.22.2 or later. From the repository root:

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector and call each tool. Each requires an `action` object. If port 3000 is busy, run `npm run dev -- --port 3002` and open the Inspector on that port.

The required action fields are `action_type` (`cross_border_purchase`), `ship_from_country`, and `destination_country` (two-letter country codes). The supported route is VN → US. Other routes/action types return REVIEW.

Add your own `supplier_id`, `product_description`, `quantity`, `amount_minor`, `currency`, and `country_of_origin` to complete the purchase context. `sku` and `budget_minor` are optional. Amounts are integer minor currency units; the budget uses the same currency as the purchase total.

Optional `evidence` is an array of objects with:

- `requirement_id`: `origin_documentation` or `tariff_classification`.
- `reference`: your document URL, file ID, or other reference.

References are passed through for review. The server does not fetch documents or authenticate their contents, and caller-supplied approval/verification flags are rejected. A trusted document-verification integration is the remaining prerequisite for issuing READY; submitting references alone produces REVIEW.

## Policy behavior

- Missing purchase fields or document references → NEEDS_EVIDENCE.
- Submitted document references or unsupported routes → REVIEW.
- Submitted total above your submitted budget → BLOCK.
- No fixed company spending limit is built in.

All requirement results and next steps are returned. Decision precedence is BLOCK > REVIEW > NEEDS_EVIDENCE > READY. Responses echo the normalized action, policy version, assessment scope, and timestamp. Customs remains advisory; the agent executes through its existing tools.

Origin and classification readiness references come from [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information), reviewed 2026-10-17. The server does not determine actual tariff classifications, duties, admissibility, sanctions, or complete import/export compliance.

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

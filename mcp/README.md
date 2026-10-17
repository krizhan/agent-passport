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

Use your own product and two-letter shipping/destination country codes. International US-bound purchases select the US import pack; other international destinations select the general purchase pack. Country codes are trimmed, normalized to uppercase, and checked against assigned ISO 3166-1 alpha-2 country and territory codes before routing.

Optionally add `amount` and `budget` to the same object for a spending check. Both are nonnegative numbers in the same currency and units; decimals and a zero budget are allowed. No currency conversion is performed. There is no action wrapper, action type, or document-reference array.

If port 3000 is busy, run `npm run dev -- --port 3011` and open http://localhost:3011/mcp/inspector. Tool results include the complete JSON in both text and structured content.

## Country validation

All three tools validate both country fields with the same schema. The accepted codes come from the assigned-entry dataset in [`iso-3166`](https://github.com/wooorm/iso-3166), pinned to version `4.4.0`. Validation uses this local dataset and makes no network requests.

| Input | Behavior |
| --- | --- |
| `" us "`, `"gb"` | Normalize to `US`, `GB` and accept. |
| Assigned country or territory codes, such as `DE`, `HK`, or `PR` | Accept. |
| `USA`, `840`, `United States`, or an empty string | Reject; supply a two-letter code. |
| `ZZ`, `QQ`, `EU`, or obsolete codes such as `SU` | Reject as unrecognized or unassigned. |
| `UK` | Reject with guidance to use `GB`; aliases are not converted. |
| `XK` | Reject; user-assigned extensions are not enabled. |

Invalid codes produce a validation error on `from_country` or `to_country` before policy selection. Recognizing a country does not imply destination-specific policy coverage or purchase clearance: valid destinations can still use the general checklist, and domestic routes still require a separate review.

Membership is enforced by the server at runtime. The MCP input schema advertises the two-letter format and acceptance rules in its field descriptions rather than listing every code.

When updating `iso-3166`, review changes to the assigned-code dataset against [ISO's country-code guidance](https://www.iso.org/iso-3166-country-codes.html), update the exact dependency version and lockfile, and record any changes to accepted inputs here. Additional aliases or extensions require an explicit change in `src/countries.ts`.

## Policy behavior

- Product and route → REVIEW, with origin and classification checks for a human reviewer.
- Amount above your submitted budget → BLOCK.
- Budget supplied without amount → NEEDS_EVIDENCE, asking for the amount.
- Domestic route → REVIEW, requesting a separate checklist.
- Invalid or missing required fields → input validation error.

Decision precedence is BLOCK > NEEDS_EVIDENCE > REVIEW. Responses echo the normalized purchase, requirement statuses, next steps, policy version, scope, and timestamp. Origin and classification are review tasks, not fields to fill in. This MVP does not issue READY or authorize/execute purchases.

For US-bound purchases, source links include [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information). Other destinations receive [WCO Harmonized System background](https://www.wcoomd.org/en/topics/nomenclature/overview.aspx) for classification and no US-specific rules. Sources reviewed 2026-10-17. Accepting a route means the general readiness checks apply; the server does not resolve country- or product-specific legal requirements or determine actual classifications, duties, admissibility, sanctions, or complete import/export compliance.

## Policy routing

All three tools use the same router after input validation. Routing selects a checklist; the existing evaluation and remediation logic in `src/policy.ts` then processes its requirements. The optional budget comparison is shared across the international packs.

| Route | Selected pack | Routing kind |
| --- | --- | --- |
| Same shipping and destination country | None; domestic review required | `unsupported` |
| Different countries, destination US | `us-import` | `destination_specific` |
| Different countries, other destination | `general-purchase` | `general` |

Every tool response includes the selected pack's `policy_version` and `scope`, plus routing details:

```json
{
  "routing": {
    "policy_id": "us-import",
    "kind": "destination_specific",
    "reason": "International purchase with destination US."
  }
}
```

Domestic routes return `policy_id: null`, `kind: "unsupported"`, and a review task. The general pack is explicitly a fallback checklist, not a country-specific policy implementation. In `get_requirements`, `supported: true` means a checklist was selected, not that the purchase is cleared. Product is retained in the purchase context; this router selects packs by shipping and destination countries without classifying the product.

Policy packs are stored as separate folders:

```text
src/
  router/
    registry.ts                     # Available policy packs
    route.ts                        # Selection rules and reasons
  policies/
    types.ts                        # Shared PolicyPack contract
    us-import/
      pack.ts                       # ID, version, scope, requirements
      requirements.ts               # US readiness requirements
      sources.ts                    # US references and review date
    general-purchase/
      pack.ts                       # ID, version, scope, requirements
      requirements.ts               # General readiness requirements
      sources.ts                    # General references and review date
```

To add a pack, create its folder with `pack.ts`, `requirements.ts`, and `sources.ts`, register it in `src/router/registry.ts`, and add its selection rule in `src/router/route.ts` before the general fallback. Keep the domestic-route check first. Packs contain requirement data; evaluation remains in `src/policy.ts` for the next stage of development.

## Check routing locally

From `mcp/`, run `npm install` if dependencies are not installed, then `npm run dev`. Open http://localhost:3000/mcp/inspector, select `check_action`, and submit:

```json
{
  "product": "Cooling fan",
  "from_country": "VN",
  "to_country": "US"
}
```

Inspect the response's `routing` object, then change the countries to exercise each branch:

| `from_country` | `to_country` | Expected `routing.policy_id` | Expected `routing.kind` |
| --- | --- | --- | --- |
| `VN` | `US` | `us-import` | `destination_specific` |
| `VN` | `CA` | `general-purchase` | `general` |
| `US` | `US` | `null` | `unsupported` |
| `vn` | `us` | `us-import` | `destination_specific` |

All these `check_action` calls return `REVIEW` with the current advisory engine. Run the same input through `get_requirements` and `get_remediation_plan`; their routing metadata should agree. `get_requirements` also returns `supported: false` for a domestic route.

On the `VN` → `US` input, add `"amount": 1500, "budget": 1000` to see `BLOCK`, or add only `"budget": 1000` to see `NEEDS_EVIDENCE`. These change the assessment, not the selected pack. A three-letter country such as `USA` or an unassigned two-letter value such as `ZZ` produces an input validation error before routing.

## Code and checks

The implementation is split by responsibility:

- `index.ts`: registers the three tools.
- `src/countries.ts`: assigned country-code membership, normalization, and validation messages.
- `src/schemas.ts`: input/output validation and TypeScript types.
- `src/router/`: registry, pack selection, and routing explanations.
- `src/policies/`: granular policy packs, requirement definitions, and source links.
- `src/policy.ts`: shared budget checks, decisions, and remediation using the selected pack.

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

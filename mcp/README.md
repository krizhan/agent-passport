# Customs · Agent Passport

Three advisory MCP tools for international purchases and marketing emails, built with mcp-use v2. Each accepts an `action_type` and the fields for that action. No backend, environment variables, or frontend setup is required.

| Tool | Purpose |
| --- | --- |
| `get_requirements` | List the modeled requirements and source links for your action and route. |
| `check_action` | Route a purchase or marketing email, return review needs, and compare an optional purchase amount with your budget. |
| `get_remediation_plan` | Run the same check and return next steps for the agent or a human. |

## Run and test

Requires Node.js 22.22.2 or later. From the repository root:

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector and call any tool with a purchase action:

```json
{
  "action_type": "purchase",
  "product": "Your product",
  "from_country": "DE",
  "to_country": "GB"
}
```

Use your own product and two-letter shipping/destination country codes. International US-bound purchases select the US import pack; other international destinations select the general purchase pack. Omitting `action_type` defaults to `purchase`, so existing three-field purchase calls still work.

Optionally add `amount` and `budget` to a purchase for a spending check. Both are nonnegative numbers in the same currency and units; decimals and a zero budget are allowed. No currency conversion is performed.

For a marketing email, use:

```json
{
  "action_type": "marketing_email",
  "recipient_country": "CA",
  "recipient_count": 1000,
  "purpose": "Product launch campaign"
}
```

`recipient_country` is required; `recipient_count` and `purpose` are optional. A supplied recipient count must be a positive integer. Submit one action per recipient country. Marketing emails select the `general-marketing` pack with review tasks for recipient permissions, sender identification, and unsubscribe/suppression handling. This fallback has no curated country-specific legal sources and always requires review.

Each action type rejects fields belonging to the other type: marketing cannot include `product`, shipping countries, `amount`, or `budget`; purchase cannot include recipient fields or a campaign purpose. Unknown action types are rejected. There is no nested action wrapper or document-reference array in tool inputs.

If port 3000 is busy, run `npm run dev -- --port 3011` and open http://localhost:3011/mcp/inspector. Tool results include the complete JSON in both text and structured content.

## Country validation

All three tools validate purchase shipping/destination countries and the marketing recipient country with the same schema. Country codes are trimmed and normalized to uppercase. The accepted codes come from the assigned-entry dataset in [`iso-3166`](https://github.com/wooorm/iso-3166), pinned to version `4.4.0`. Validation uses this local dataset and makes no network requests.

| Input | Behavior |
| --- | --- |
| `" us "`, `"gb"` | Normalize to `US`, `GB` and accept. |
| Assigned country or territory codes, such as `DE`, `HK`, or `PR` | Accept. |
| `USA`, `840`, `United States`, or an empty string | Reject; supply a two-letter code. |
| `ZZ`, `QQ`, `EU`, or obsolete codes such as `SU` | Reject as unrecognized or unassigned. |
| `UK` | Reject with guidance to use `GB`; aliases are not converted. |
| `XK` | Reject; user-assigned extensions are not enabled. |

Invalid codes produce a validation error on `from_country`, `to_country`, or `recipient_country` before policy selection. Recognizing a country does not imply country-specific policy coverage or clearance: valid countries can still use a general checklist, and domestic purchases still require a separate review.

Membership is enforced by the server at runtime. The MCP input schema advertises the two-letter format and acceptance rules in its field descriptions rather than listing every code.

When updating `iso-3166`, review changes to the assigned-code dataset against [ISO's country-code guidance](https://www.iso.org/iso-3166-country-codes.html), update the exact dependency version and lockfile, and record any changes to accepted inputs here. Additional aliases or extensions require an explicit change in `src/countries.ts`.

## Policy behavior

- Product and route → REVIEW, with origin and classification checks for a human reviewer.
- Amount above your submitted budget → BLOCK.
- Budget supplied without amount → NEEDS_EVIDENCE, asking for the amount.
- Domestic route → REVIEW, requesting a separate checklist.
- Marketing email → REVIEW, with permission, sender-identification, and unsubscribe review tasks.
- Invalid or missing required fields → input validation error.

Decision precedence is BLOCK > NEEDS_EVIDENCE > REVIEW. Responses echo the normalized `action`, requirement statuses, next steps, policy version, scope, and timestamp. Purchase responses also retain the existing `purchase` field for compatibility; marketing responses do not include it. Origin and classification are review tasks, not fields to fill in. This MVP does not issue READY or authorize/execute purchases or send emails.

For US-bound purchases, source links include [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information). Other destinations receive [WCO Harmonized System background](https://www.wcoomd.org/en/topics/nomenclature/overview.aspx) for classification and no US-specific rules. Sources reviewed 2026-10-17. Accepting a route means the general readiness checks apply; the server does not resolve country- or product-specific legal requirements or determine actual classifications, duties, admissibility, sanctions, or complete import/export compliance.

## Policy routing

All three tools use the same router after input validation. The router first checks `action_type`, then uses the countries relevant to that action. Routing selects a checklist; the existing evaluation and remediation logic in `src/policy.ts` then processes its requirements. The optional budget comparison is shared across the international purchase packs.

| Action type | Route | Selected pack | Routing kind |
| --- | --- | --- | --- |
| `purchase` | Same shipping and destination country | None; domestic review required | `unsupported` |
| `purchase` | Different countries, destination US | `us-import` | `destination_specific` |
| `purchase` | Different countries, other destination | `general-purchase` | `general` |
| `marketing_email` | Any valid recipient country | `general-marketing` | `general` |

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

Domestic purchase routes return `policy_id: null`, `kind: "unsupported"`, and a review task. General packs are fallback checklists, not country-specific policy implementations. In `get_requirements`, `supported: true` means a checklist was selected, not that the action is cleared. Product is retained in purchase context without being classified. Import and export are not separate action types in this MVP; current trade packs cover purchasing readiness rather than complete import/export authorization.

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
    general-marketing/
      pack.ts                       # ID, version, scope, requirements
      requirements.ts               # General marketing review tasks
      sources.ts                    # Null URLs until legal sources are curated
```

To add a pack, create its folder with `pack.ts`, `requirements.ts`, and `sources.ts`, register it in `src/router/registry.ts`, and add its selection rule in `src/router/route.ts`. Dispatch by action type first; within purchase routing, keep the domestic-country check before destination-specific selection and the general fallback. A new action type also needs its own schema in `src/schemas.ts`. Packs contain requirement data; evaluation remains in `src/policy.ts` for the next stage of development.

## Check routing locally

From `mcp/`, run `npm install` if dependencies are not installed, then `npm run dev`. Open http://localhost:3000/mcp/inspector, select `check_action`, and submit:

```json
{
  "action_type": "purchase",
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

Then submit the `marketing_email` example above. Expect `routing.policy_id: "general-marketing"`, `routing.kind: "general"`, and decision `REVIEW`. Repeat it through all three tools; the selected pack should agree. Changing only `recipient_country` to `US` retains the general marketing pack. Missing `recipient_country`, an unknown action type, or mixing purchase and marketing fields produces an input validation error.

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

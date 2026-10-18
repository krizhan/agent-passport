# Customs · Agent Passport

Five advisory MCP tools, built with mcp-use v2. Scenario-based trade, purchase readiness, marketing review, and U.S. restricted-party screening have separate public input schemas. No backend, database, API key, or environment variables are required. Screening works offline against the bundled official JSON snapshot. Only the optional manual refresh command needs outbound HTTPS.

| Tool | Inputs and behavior |
| --- | --- |
| `check_import_export` | Product and route → combined scenario rules, import/export/transit findings, party screening, evidence/document gaps, sources and next steps. |
| `get_import_export_requirements` | Purchase inputs → destination-scoped readiness checklist and source links. |
| `get_import_export_remediation_plan` | Purchase inputs → original readiness checklist, optional budget comparison and next steps. |
| `check_marketing_email` | Recipient country and optional count/purpose → general permission, sender-identification, and unsubscribe review checklist. |
| `screen_restricted_party` | Party name and optional aliases/country/address → bundled U.S. CSL snapshot search, provenance, and review steps. |

Each workflow has explicit tool names. The requirement/remediation tools retain their purchase checklist inputs; the trade check accepts the expanded scenario input. Public inputs do not accept action_type.

## Run locally

Requires Node.js 22.22.2 or later. From the repository root:

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector. If that port is occupied, use `npm run dev -- --port 3011` and the matching Inspector URL.

## Import and export scenarios

`check_import_export` combines **52 hardcoded rules** and **70 example requests** across U.S., EU, Great Britain/UK scope, China, India, Canada, Australia, Japan and South Korea, plus shared evidence and ownership checks. This is partial scenario coverage, not full country coverage. The public tool names are retained. Requirement/remediation, marketing and screening inputs remain compatible; the expanded trade tool also accepts the existing amount/budget fields.

```json
{
  "product": "Industrial controller",
  "from_country": "US",
  "to_country": "DE",
  "origin_country": "US",
  "product_category": "dual_use",
  "transaction_type": "shipment",
  "end_user": "Example factory",
  "end_use": "Civilian production line",
  "parties": [{ "name": "Example Factory GmbH", "role": "end_user", "country": "DE" }]
}
```

Only `product`, `from_country`, and `to_country` are required at submission. Missing category, classifications, technical details, parties or evidence become explicit follow-up requests. Categories are `general_goods`, `food_agriculture`, `medical`, `chemicals`, `wildlife`, `waste`, `dual_use`, `advanced_computing`, `encryption`, `military`, `nuclear`, and `rare_earth`. Categories and technical flags are caller assertions; they do not establish controlled status.

Optional inputs include `amount`, `budget`, `origin_country`, `transit_countries`, `planned_date`, `transaction_type` (`shipment`, `reexport`, `technology_transfer`, `transit`), `hs_code` (6/8/10 digits), `control_classification`, `classification_evidence`, `technical_specifications`, `end_user`, `end_use`, `end_use_flags`, `quantity`, `value`, `currency`, `ownership`, `parties`, and `documents`. Documents use `type`, `reference`, and optional `expires_on`. Parties use a name and role, with optional aliases/country/address. See [copyable requests](src/trade/examples/requests.json) for technical keys and document types.

The evaluator normalizes ISO countries, maps EU members to the EU pack, and combines applicable rules. Use member-country codes such as `DE`, not `EU`. Conditions are `MATCHED`, `NOT_MATCHED`, or `UNKNOWN`; missing facts never establish negative applicability. Rules with effective intervals use the planned date (inclusive start, exclusive end). Source review dates are separate from legal effective dates, and rules without intervals require current-law review.

Supplied documents remain `PROVIDED_UNVERIFIED`; expired documents are checked against the planned date. Each supplied party is searched against the bundled CSL. Stale/unavailable screening adds a current-evidence gap while retaining historical candidates. A candidate is neither confirmed identity nor an automatic legal prohibition.

Results include grouped `findings`, `rule_evaluations`, `coverage`, `missing_information`, `required_documents`, `screening`, `sources`, `requirements`, `purchase_constraint`, and `remediation_plan`. Overall status is `BLOCK` for a fully matched prohibition or an exceeded caller budget, `NEEDS_EVIDENCE` for missing inputs/documents/current screening, otherwise `REVIEW`. Unknown applicability or missing required evidence downgrades binding licensing/prohibition findings to review. The shipped catalog uses classification/review/conditional authorization findings and contains no categorical automatic legal prohibition. Caller-supplied amount/budget constraints are tracked separately from legal findings; exceeding the submitted budget can also return BLOCK.

Every result has `advisory_only: true`, `can_proceed_under_checked_rules: false`, `execution_performed: false`, and `coverage.full_transaction_coverage: false`. Unsupported route sides remain explicit. Sources include verification status/date; Japanese METI references that could not be fetched are marked `reference_only` with a null review date. EU national overlays, Northern Ireland, indirect ownership, FDP/de minimis calculations, current quotas, tariffs/duties and emergency measures require additional review.

### Regenerate the demo

```bash
npm run typecheck
npm run demo:trade
npm run build
```

`demo:trade` compiles to ignored `.trade-build/`, runs the actual evaluator, exports copyable request JSON, and writes the recorded results used at `/scenarios`. The gallery needs no credentials/server connection; it shows assessment timestamps and does not recompute requests in the browser. `/demo` remains captured gateway history and recognizes the new tool.

### Add a scenario

Add a `TradeRule` to `src/trade/rules/`, verify its official sources, and add a demo example to `src/trade/examples/`. Contracts live in `types.ts` and `schemas.ts`; `conditions.ts` evaluates predicates and `evaluate.ts` combines rules. Supported predicates are `eq`, `in`, `contains`, `gte`, `lte`, `exists`, and nested `all`/`any`/`not`, with dotted technical-specification paths. `exists` explicitly tests presence; other missing operands are `UNKNOWN`. Regenerate the demo after changing rules, examples or screening data.

## Marketing review

Select `check_marketing_email` and submit:

```json
{
  "recipient_country": "CA",
  "recipient_count": 1000,
  "purpose": "Product launch campaign"
}
```

Only `recipient_country` is required. Recipient count, if supplied, must be a positive integer; purpose is optional context. Submit one check per recipient country. The dedicated tool does not require `action_type`; the response echoes `action_type: "marketing_email"`.

This restores the original `general-marketing` policy pack: recipient-permission, sender-identification, and unsubscribe/suppression review tasks. It always returns `REVIEW`, with requirements and remediation. It does not inspect email content, verify consent records, maintain suppression lists, or send email. Count and purpose are context and do not change the assessment. Country-specific legal sources have not been curated; requirement URLs remain null.

## Restricted-party screening

Select `screen_restricted_party` and submit:

```json
{
  "name": "Example Trading Ltd",
  "aliases": ["Example Trading Limited"],
  "country": "GB",
  "address": "10 Example Street, London"
}
```

Only `name` is required. Names must contain at least two letters/numbers and be at most 200 characters. Up to 10 optional aliases are screened. Country codes are normalized and validated as assigned ISO 3166-1 alpha-2 codes; `UK` should be `GB`. Address is optional review context, not automatically verified. Screening rejects purchase fields and `action_type`.

### Official data

- [U.S. Consolidated Screening List (CSL)](https://www.trade.gov/consolidated-screening-list): Commerce, State, and Treasury list aggregation, guidance, downloads, and source-agency links.
- [Public JSON download](https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json): used to create and manually refresh the committed snapshot; no credentials required. CSV and TSV downloads are linked from the CSL page.
- [ITA API portal](https://developer.trade.gov/): alternative fuzzy-search API. API use requires account/subscription-key setup; it is not used here.

The committed `data/consolidated-screening-list.json` contains all 26,154 records from 13 source lists in the captured official download. Its companion `.meta.json` records generation/retrieval dates, source counts, and checksums. All fields are retained; formatting is canonicalized. See [snapshot details](data/README.md). Source modification dates may be old because a list has not changed; age reporting uses generation and import times instead.

### Implementation

1. Import the committed JSON snapshot and provenance metadata into the server bundle. Each tool call uses these local records; no network request or caller-supplied list is involved.
2. Validate the canonical JSON checksum, dataset schema, declared total, zero offset, required source coverage, unique `(source, id)` pairs, and provenance consistency. IDs can legitimately recur across different lists.
3. Report generation/source-import age as `source.age_hours` and `source.freshness`. A snapshot up to 48 hours old is `RECENT`; older data is `STALE` and still supports historical matching, with an explicit review requirement. This is an application age threshold, not a government-defined compliance window or a live-currentness guarantee.
4. Compare submitted names and aliases with primary names and aliases in every record. Normalize Unicode accents, case, punctuation, and whitespace; consider reordered tokens, token containment, and character-bigram similarity. Threshold: 0.85. Scores are retrieval heuristics, not identity probabilities. No transliteration or verified-identifier matching is implemented.
5. Country never filters out candidates. Return country comparison and listed addresses for human review, plus list names, programs, original agency URLs, and any supplied licensing notes.
6. Return at most 20 candidate records, with the full candidate count and a truncation flag. Different source listings are preserved even if their party ID is the same.
7. Attach original download time, dataset generation time, upstream Last-Modified, committed/upstream SHA-256 hashes, source metadata, record count, method/version, limitations, and remediation. `source.mode` is `bundled_json` and `source.live_lookup_performed` is always false.

To refresh the committed files explicitly:

```bash
npm run refresh:screening-list
npm run typecheck
npm run build
```

Commit the JSON, metadata, and compressed copy and redeploy to publish a refreshed snapshot. Tool calls never update the snapshot automatically. The compressed copy fits Manufact's 25 MiB source-file limit; `npm run build` verifies and restores the raw JSON before bundling it.

| `screening.status` | Meaning | Overall decision |
| --- | --- | --- |
| `POTENTIAL_MATCH` | One or more candidate records require identity and restriction review. | `REVIEW` |
| `NO_CANDIDATES` | No names met this heuristic search threshold in the bundled snapshot. | `REVIEW` |
| `UNAVAILABLE` | Bundled schema, checksum, metadata, timestamps, or completeness failed; screening was not completed. | `NEEDS_EVIDENCE` |

A possible name match never automatically establishes identity or a legal prohibition. No candidates is not clearance. This tool does not implement ownership/control rules, country-wide restrictions, end-use restrictions, license determinations, non-U.S. lists, or every identity-matching technique. Follow the source-agency links and review the wider transaction. All results retain `advisory_only: true`, `can_proceed_under_checked_rules: false`, and `execution_performed: false`.

## Purchase checks

The requirement/remediation tools retain the original purchase checklist and accept:

```json
{
  "product": "Cooling fan",
  "from_country": "VN",
  "to_country": "US"
}
```

Public inputs do not accept `action_type`; the selected tool identifies the workflow. Product and both countries are required. Optional `amount` and `budget` must use the same currency and units; both are nonnegative numbers and zero is allowed. No currency conversion occurs. These checklist inputs reject unknown and screening fields. The expanded trade tool accepts the additional scenario fields described above.

| Route | Policy | Routing kind |
| --- | --- | --- |
| Same shipping and destination country | No pack; separate domestic review required | `unsupported` |
| Different countries, destination US | `us-import` | `destination_specific` |
| Different countries, other destination | `general-purchase` | `general` |
| Separate marketing tool, any recipient country | `general-marketing` | `general` |
| Separate screening tool, any party country | `us-restricted-party` | `list_screening` |

For `get_import_export_remediation_plan`, the original advisory checklist behavior remains: amount above budget → `BLOCK`; budget without amount → `NEEDS_EVIDENCE`; other valid purchase inputs → `REVIEW`. Product names are retained without classification. Checklist results retain both `action` and legacy `purchase`; the expanded trade check returns the grouped scenario result described above. Standalone screening results have `action` and `screening`.

Countries use the local `iso-3166` dataset, pinned to `4.4.0`. Whitespace/lowercase normalize; assigned territory codes are accepted. Three-letter, obsolete, unassigned, `UK`, and `XK` codes are rejected. A recognized country does not imply jurisdiction-specific policy coverage.

The US purchase pack links to [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information). General purchase classification links to [WCO background](https://www.wcoomd.org/en/topics/nomenclature/overview.aspx). These packs do not determine complete import/export compliance, classification, admissibility, duties, or licensing.

Snapshots marked `STALE` can still return `POTENTIAL_MATCH` or `NO_CANDIDATES`, but the age is reported and the summary requires refresh/review. No result represents a live source lookup.

## Code and verification

- `index.ts`: five public tools, distinct trade/purchase/marketing/screening schemas, and MCP envelopes.
- `src/schemas.ts`, `src/countries.ts`: shared action/result schemas and country validation.
- `src/router/`: policy registration, selection, and reasons.
- `src/policies/`: independent `us-import`, `general-purchase`, `general-marketing`, and `us-restricted-party` packs.
- `src/policy.ts`: purchase and marketing checks with remediation.
- `src/screening/`: bundled snapshot validation, age reporting, matching, results.
- `data/`: full CSL JSON snapshot and provenance metadata, embedded by the build.
- `scripts/refresh-screening-list.mjs`: explicit refresh from the official public download.

```bash
npm run typecheck
npm run build
npm start -- --port 3003 --with-inspector
```

No automated test suite is included. Typechecking and production builds are available through the commands above.

## Manufact deployment

Existing endpoint: https://bold-cloud-g95ht.run.mcp-use.com/mcp

[Management dashboard](https://manufact.com/cloud/org-312cbb99-5qvf5/servers/ff38bb29-7976-4069-84af-c3c190735e2d/overview).

Deployment is separate from local implementation. From `mcp/`, when deployment is requested:

```bash
npm run deploy -- --no-github -y --build-command "npm run build"
```

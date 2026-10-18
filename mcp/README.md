# Customs · Agent Passport

Seven advisory MCP tools, built with mcp-use v2. Scenario-based trade, purchase readiness, marketing review, and U.S. restricted-party screening have separate public input schemas. No backend, database, API key, or environment variables are required. Screening works offline against the bundled official JSON snapshot. Only the optional manual refresh command needs outbound HTTPS.

| Tool | Inputs and behavior |
| --- | --- |
| `check_import_export` | Product and route → combined scenario rules, import/export/transit findings, party screening, evidence/document gaps, sources and next steps. |
| `open_food_import_review` | Known US-bound food shipment → one interactive evidence form and initial trade assessment. |
| `submit_food_import_review` | Original shipment and supplied form evidence → updated trade assessment, prior-notice review checklist and workflow status. |
| `get_import_export_requirements` | Purchase inputs → destination-scoped readiness checklist and source links. |
| `get_import_export_remediation_plan` | Purchase inputs → original readiness checklist and next steps. |
| `check_marketing_email` | Rendered email, recipient and supplied evidence → US CAN-SPAM, Canada CASL and UK PECR findings, missing evidence and proposed corrections. |
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

## Food-import MCP App

In the Inspector, call `open_food_import_review` with:

```json
{
  "shipment": {
    "product": "Packaged roasted coffee beans",
    "from_country": "DO",
    "to_country": "US",
    "product_category": "food_agriculture"
  }
}
```

The form collects food/manufacturer facts, manufacturing origin, a proposed customs code and classification evidence, document references, and prior-notice confirmation or a supported non-applicability statement. Prefill only known facts; blank fields remain unknown. Existing shipment parties, end use, quantities, documents and other supplied inputs are retained. Use the original `shipment` when resubmitting, so removing a newly added form reference does not silently retain it from an earlier recheck.

1. The calling agent opens the tool. In a host supporting MCP Apps, its tool result renders the form in a sandboxed UI. Every client also receives structured JSON and a text summary.
2. The user fills in the form. Unsubmitted edits are React state in that mounted form, not automatically shared with the agent.
3. **Recheck evidence** calls the data-only `submit_food_import_review` tool through the host bridge. It adds supplied references, preserves original expiration dates, reruns the actual trade evaluator, and displays unresolved inputs, documents and route coverage. This does not upload/authenticate documents or submit FDA filings.
4. Where the host supports model-context updates, the latest submitted result is made available for future model turns. **Share result with agent** explicitly sends the submitted facts and remaining review steps as a follow-up message. The host decides whether to accept it. Changed drafts require another recheck before sharing. Hosts without follow-up support offer selectable JSON to copy into chat.
5. The agent can explain outstanding work and use its other tools within the user's instructions. `READY_FOR_REVIEW` means the modeled evidence is assembled; human review, unsupported route sides and all transaction-authorization limits remain explicit.

Clients without MCP Apps can collect the same facts conversationally and call `submit_food_import_review` with `{ "shipment": { ... }, "evidence": { ... } }`; inspect the tool input schema for evidence keys. Omitted evidence fields retain known shipment facts; explicit blanks clear form-managed facts back to unknown. The prior-notice checklist supplements the existing FDA applicability rule; it does not establish applicability from a broad food category or resolve the broader assessment merely because a confirmation reference is supplied.

This first form has no durable case store, external lookup, file upload or reviewer identity verification. Its recheck is read-only with respect to business systems. Returned results can be retained by the calling client; reloading the UI does not retrieve a saved case.

Run `npx mcp-use typecheck`, `npm run typecheck`, and `npm run build` after View changes. The View lives in `views/food-import-review/`; its contracts and evaluator adapter live in `src/food-review/`. For a real rendered capture:

```bash
npx mcp-use screenshot --mcp http://127.0.0.1:3000/mcp \
  --tool open_food_import_review \
  '{"shipment":{"product":"Packaged roasted coffee beans","from_country":"DO"}}' \
  --output /tmp/food-import-review.png
```

## Import and export scenarios

`check_import_export` combines **57 hardcoded rules** and **100 example requests** across U.S., EU, Great Britain/UK scope, China, India, Singapore, Canada, Australia, Japan and South Korea, plus shared evidence and ownership checks. This is partial scenario coverage, not full country coverage. The public tool names are retained. Requirement/remediation and screening inputs remain compatible. Marketing uses the independent evidence-based schema described below.

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

Only `product`, `from_country`, and `to_country` are required at submission. Missing category, classifications, technical details, parties or evidence become explicit follow-up requests. Categories are `general_goods`, `food_agriculture`, `medical`, `chemicals`, `wildlife`, `waste`, `dual_use`, `advanced_computing`, `encryption`, `military`, `nuclear`, `rare_earth`, `chewing_gum`, and `electronic_cigarette`. Categories and technical flags are caller assertions; they do not establish controlled status.

Optional inputs include `origin_country`, `transit_countries`, `planned_date`, `transaction_type` (`shipment`, `reexport`, `technology_transfer`, `transit`), `hs_code` (6/8/10 digits), `control_classification`, `classification_evidence`, `technical_specifications`, `end_user`, `end_use`, `end_use_flags`, `quantity`, `value`, `currency`, `ownership`, `parties`, `documents`, `shipment`, and `prior_notice`. Documents use `type`, `reference`, optional `expires_on`, and optional `product`/`shipment_id` bindings. Parties use a name and role, with optional aliases/country/address. See [copyable requests](src/trade/examples/requests.json) for technical keys and document types.

The evaluator normalizes ISO countries, maps EU members to the EU pack, and combines applicable rules. Use member-country codes such as `DE`, not `EU`. Conditions are `MATCHED`, `NOT_MATCHED`, or `UNKNOWN`; missing facts never establish negative applicability. Rules with effective intervals use the planned date (inclusive start, exclusive end). Source review dates are separate from legal effective dates, and rules without intervals require current-law review.

Supplied documents remain `PROVIDED_UNVERIFIED`; expired documents are checked against the planned date. Each supplied party is searched against the bundled CSL. Stale/unavailable screening adds a current-evidence gap while retaining historical candidates. A candidate is neither confirmed identity nor an automatic legal prohibition.

Results include grouped `findings`, `rule_evaluations`, `coverage`, `missing_information`, `required_documents`, `screening`, `sources`, `requirements`, and `remediation_plan`. Overall status is `BLOCK` for a fully matched prohibition or failed modeled shipment condition, `NEEDS_EVIDENCE` for missing inputs/documents/current screening, otherwise `REVIEW`. Unknown applicability or missing required evidence downgrades binding licensing/prohibition findings to review. Executable findings add `check` with `status`, `reason_code`, evidence references, missing fields, and next steps; individual `SATISFIED` checks do not create a transaction-level pass.

### Singapore, India, and FDA prior-notice checks

- Singapore `chewing_gum`: supply `technical_specifications.gum_type` (`ordinary`, `oral_dental`, or `medicinal`) and any boolean `hsa_approval_claimed`. Ordinary gum outside the approved exclusion is blocked. Claimed oral-dental/medicinal exclusions need a current `hsa_approval` document identifying the exact `product`, followed by human review. Conflicting product/approval statements stay under review.
- India `electronic_cigarette`: supply boolean `technical_specifications.licensed_medicine_claimed`. The modeled prohibition includes nicotine-free devices. A claimed Drugs and Cosmetics Act exclusion needs a current `medicinal_licence` document bound to the product and human review; an absent claim is unknown, not false.
- U.S. `food_agriculture`: detailed prior-notice checks cover `technical_specifications.food_type: "packaged_roasted_coffee"`, `shipment.purpose: "commercial_sale"`, and `shipment.transport_mode: "air"` or `"sea"`. Other food, purposes and modes retain the broader FDA applicability review; no exemption is inferred.

For this coffee workflow, `shipment` accepts `id`, `purpose`, `transport_mode`, `arrival_at` (timestamp with UTC offset), and `arrival_timezone` (the first U.S. port's IANA zone). `prior_notice` accepts `confirmation_number`, `confirmed_at`, `submission_method` (`pnsi` or `abi_ace`), and `evidence_reference`. The referenced `fda_prior_notice_confirmation` document must identify the matching product and shipment; an absent binding, expired record, wrong product, or wrong shipment cannot satisfy the evidence check.

Timing uses FDA confirmation time: at least four hours before air arrival or eight hours before sea arrival, and no more than 15 calendar days for PNSI or 30 for ABI/ACE in the declared port time zone. Future confirmations and past arrivals require review. Supplied evidence and filing contents remain unverified; satisfied reference/timing checks retain all other customs, FDA, screening, export-side and coverage requirements. The existing food-import form continues to collect unverified references; detailed facts can be supplied through its shipment input or directly to `check_import_export`.

Examples include prohibition, exception, conflict, expired/mismatched evidence, missing shipment context, missing notice → matching evidence, air/sea minimum boundaries, calendar-day limits, and time-zone cases. Rerun `demo:trade` to refresh timestamped synthetic evidence before presenting the demo.

Every result has `advisory_only: true`, `can_proceed_under_checked_rules: false`, `execution_performed: false`, and `coverage.full_transaction_coverage: false`. Unsupported route sides remain explicit. Sources include verification status/date; Japanese METI references that could not be fetched are marked `reference_only` with a null review date. EU national overlays, Northern Ireland, indirect ownership, FDP/de minimis calculations, current quotas, tariffs/duties and emergency measures require additional review.

### Regenerate the demo

```bash
npm run typecheck
npm run demo:trade
npm run build
```

`demo:trade` compiles to ignored `.trade-build/`, runs the actual evaluator, exports copyable request JSON, and writes the recorded results used at `/scenarios`. The gallery needs no credentials/server connection; it shows assessment timestamps and does not recompute requests in the browser. `/demo` remains captured gateway history and recognizes the new tool.

### Add a scenario

Add a `TradeRule` to `src/trade/rules/`, verify its official sources, and add a demo example to `src/trade/examples/`. Contracts live in `types.ts` and `schemas.ts`; `conditions.ts` evaluates predicates and `evaluate.ts` combines rules. Supported predicates are `eq`, `in`, `contains`, `gte`, `lte`, `exists`, and nested `all`/`any`/`not`, with dotted technical-specification paths. `exists` explicitly tests presence; other missing operands are `UNKNOWN`. An optional `assess` callback supports evidence binding and calendar-time calculations after category and condition applicability are established. Its schema-validated result supplies missing fields, check status and remediation; evaluation errors require review. Regenerate the demo after changing rules, examples or screening data.

## Marketing review

`check_marketing_email` now requires `sender`, `recipient`, `message` and `planned_send_at`, with `dispatch_country` and typed `evidence`. The former country/count/purpose contract has been replaced. It evaluates one rendered commercial email for one recipient, using candidate US CAN-SPAM, Canada CASL and UK PECR packs.

Start the MCP server and use the Inspector at http://localhost:3000/mcp/inspector. Read `marketing://examples` for fresh copyable requests, then call `check_marketing_email`. Run `npm run demo:marketing` to evaluate and export the 18 examples. See the [engine guide](src/marketing/README.md) and [copyable demonstration requests](src/marketing/requests.json). The website displays captured marketing results at `/demo`; it does not run marketing checks.

Results distinguish `BLOCK`, `NEEDS_EVIDENCE`, `REVIEW`, and `NO_BLOCKERS_FOUND`. They include sources, evidence scope/freshness, exact message SHA-256, proposed corrections and recheck instructions. Supplied evidence is not independently authenticated. No live provider calls or email sending occur, and no-blockers results remain limited to the implemented checks. Changed drafts need fresh reviews bound to the new fingerprint.

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

Product and both countries are required. The tool selects the workflow; `action_type` is rejected in public inputs and added internally for routing. Unknown fields and screening fields are rejected.

| Route | Policy | Routing kind |
| --- | --- | --- |
| Same shipping and destination country | No pack; separate domestic review required | `unsupported` |
| Different countries, destination US | `us-import` | `destination_specific` |
| Different countries, other destination | `general-purchase` | `general` |
| Separate screening tool, any party country | `us-restricted-party` | `list_screening` |

Purchase requirement checks remain advisory. Valid checks return `REVIEW` with the applicable requirements and next steps; missing or invalid required inputs are rejected. Product names are retained without classification. Purchase results retain both `action` and legacy `purchase`; screening results have `action` and `screening`.

Countries use the local `iso-3166` dataset, pinned to `4.4.0`. Whitespace/lowercase normalize; assigned territory codes are accepted. Three-letter, obsolete, unassigned, `UK`, and `XK` codes are rejected. A recognized country does not imply jurisdiction-specific policy coverage.

The US purchase pack links to [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information). General purchase classification links to [WCO background](https://www.wcoomd.org/en/topics/nomenclature/overview.aspx). These packs do not determine complete import/export compliance, classification, admissibility, duties, or licensing.

Snapshots marked `STALE` can still return `POTENTIAL_MATCH` or `NO_CANDIDATES`, but the age is reported and the summary requires refresh/review. No result represents a live source lookup.

## Code and verification

- `index.ts`: seven public tools, distinct trade/purchase/marketing/screening schemas, and MCP envelopes.
- `src/schemas.ts`, `src/countries.ts`: shared action/result schemas and country validation.
- `src/router/`: policy registration, selection, and reasons.
- `src/policies/`: independent `us-import`, `general-purchase`, and `us-restricted-party` packs.
- `src/policy.ts`: purchase checks with remediation.
- `src/marketing/`: independent schemas, evidence validation, three policy packs and demonstration scenarios.
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

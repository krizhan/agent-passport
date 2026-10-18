# Customs · Agent Passport

Five advisory MCP tools, built with mcp-use v2. Purchase readiness, marketing review, and U.S. restricted-party screening have separate public input schemas. No backend, database, API key, or environment variables are required. Screening works offline against the bundled official JSON snapshot. Only the optional manual refresh command needs outbound HTTPS.

| Tool | Inputs and behavior |
| --- | --- |
| `get_requirements` | Purchase inputs → destination-scoped readiness checklist and source links. |
| `check_action` | Purchase inputs → review needs, optional budget comparison, and remediation. |
| `get_remediation_plan` | Purchase inputs → the same evaluation and next steps as `check_action`. |
| `check_marketing_email` | Recipient country and optional count/purpose → general permission, sender-identification, and unsubscribe review checklist. |
| `screen_restricted_party` | Party name and optional aliases/country/address → bundled U.S. CSL snapshot search, provenance, and review steps. |

Marketing and screening have dedicated tools. Purchase tools continue to accept purchase inputs only.

## Run locally

Requires Node.js 22.22.2 or later. From the repository root:

```bash
cd mcp
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector. If that port is occupied, use `npm run dev -- --port 3011` and the matching Inspector URL.

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

Commit both JSON files and redeploy to publish a refreshed snapshot. Tool calls never update the snapshot automatically.

| `screening.status` | Meaning | Overall decision |
| --- | --- | --- |
| `POTENTIAL_MATCH` | One or more candidate records require identity and restriction review. | `REVIEW` |
| `NO_CANDIDATES` | No names met this heuristic search threshold in the bundled snapshot. | `REVIEW` |
| `UNAVAILABLE` | Bundled schema, checksum, metadata, timestamps, or completeness failed; screening was not completed. | `NEEDS_EVIDENCE` |

A possible name match never automatically establishes identity or a legal prohibition. No candidates is not clearance. This tool does not implement ownership/control rules, country-wide restrictions, end-use restrictions, license determinations, non-U.S. lists, or every identity-matching technique. Follow the source-agency links and review the wider transaction. All results retain `advisory_only: true`, `can_proceed_under_checked_rules: false`, and `execution_performed: false`.

## Purchase checks

All three purchase tools accept:

```json
{
  "product": "Cooling fan",
  "from_country": "VN",
  "to_country": "US"
}
```

`action_type` may be omitted or set to `purchase`. Product and both countries are required. Optional `amount` and `budget` must use the same currency and units; both are nonnegative numbers and zero is allowed. No currency conversion occurs. Unknown fields and screening fields are rejected.

| Route | Policy | Routing kind |
| --- | --- | --- |
| Same shipping and destination country | No pack; separate domestic review required | `unsupported` |
| Different countries, destination US | `us-import` | `destination_specific` |
| Different countries, other destination | `general-purchase` | `general` |
| Separate marketing tool, any recipient country | `general-marketing` | `general` |
| Separate screening tool, any party country | `us-restricted-party` | `list_screening` |

Purchase requirement checks remain advisory. Amount above budget → `BLOCK`; budget without amount → `NEEDS_EVIDENCE`; other valid purchase inputs → `REVIEW`. Product names are retained without classification. Purchase results retain both `action` and legacy `purchase`; screening results have `action` and `screening`.

Countries use the local `iso-3166` dataset, pinned to `4.4.0`. Whitespace/lowercase normalize; assigned territory codes are accepted. Three-letter, obsolete, unassigned, `UK`, and `XK` codes are rejected. A recognized country does not imply jurisdiction-specific policy coverage.

The US purchase pack links to [19 CFR 141.86](https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86) and [USITC tariff information](https://www.usitc.gov/harmonized_tariff_information). General purchase classification links to [WCO background](https://www.wcoomd.org/en/topics/nomenclature/overview.aspx). These packs do not determine complete import/export compliance, classification, admissibility, duties, or licensing.

Snapshots marked `STALE` can still return `POTENTIAL_MATCH` or `NO_CANDIDATES`, but the age is reported and the summary requires refresh/review. No result represents a live source lookup.

## Code and verification

- `index.ts`: five public tools, distinct purchase/marketing/screening schemas, and MCP envelopes.
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
npx -y mcp-use@latest deploy --no-github -y
```

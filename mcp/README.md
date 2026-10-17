# Agent Passport MCP · regulatory checks

Three advisory tools for international compliance, built with `mcp-use` 2.10.1. No backend, environment variables, API keys, or external lookups are required.

| Tool | Purpose |
| --- | --- |
| `get_requirements` | Discover the selected pack's requirements, required fields, and official sources. |
| `check_action` | Evaluate declared product/shipment facts and return findings, coverage, and proposed actions. |
| `get_remediation_plan` | Return the same assessment and typed next steps as `check_action`. |

## Start and verify

Requires Node.js 22.22.2 or later. From `mcp/`:

```bash
npm ci
npm run typecheck
npm run demo
npm run build
npm run dev -- --port 3017
```

Open http://localhost:3017/mcp/inspector to call the three tools and try the fixture inputs. For production, run `npm start -- --port 3017` after building.

`npm run demo` uses synthetic records under `fixtures/`, with assessment time pinned to `2026-10-17T12:00:00Z`. The notice fixture is not a real FDA filing.

## Implemented scope

| Destination | Declared product | Implemented behavior |
| --- | --- | --- |
| Singapore (`SG`) | `chewing_gum` | Ordinary gum or explicitly unapproved dental/medicinal gum is blocked. Claimed approved exclusions need matching evidence and human review. |
| India (`IN`) | `electronic_cigarette` | Devices without a claimed licensed medicinal exclusion are blocked, including nicotine-free devices. Licence claims require evidence and review. |
| US (`US`) | `food`, specifically packaged roasted coffee | For commercial air/sea arrivals, assess prior-notice applicability, matching supplied confirmation references, and the filing window. |
| Other product/destination combinations | Any | Review required; unmatched products are never automatically cleared. |
| Domestic purchase | Any | Unsupported; review required. |
| Marketing email | Any recipient country | General review checklist; no implemented country-specific marketing rules. |

Singapore's approved dental/medicinal exclusion and India's licensed medicinal exclusion are not automatically granted from a label or caller assertion. Other food types, personal-use contexts, transit, samples, mail, road, rail, and exemption claims require review.

## Inputs

Purchase calls require `product`, `from_country`, and `to_country`; `action_type` defaults to `purchase`. Supply `product_category` from specifications: `chewing_gum`, `electronic_cigarette`, `food`, `other`, or `unknown`. Missing/unknown categories request information for implemented destination packs. Product names are not keyword-classified.

```json
{
  "product": "Ordinary mint chewing gum",
  "from_country": "MY",
  "to_country": "SG",
  "product_category": "chewing_gum",
  "product_facts": { "gum_type": "ordinary" }
}
```

Expected: `BLOCK`, official source, and `stop_action`. Use `fixtures/in-vape.json` for the Indian prohibition and `fixtures/us-coffee-missing-notice.json` for evidence collection.

| Category | `product_facts` fields |
| --- | --- |
| `chewing_gum` | `gum_type`: `ordinary`, `oral_dental`, `medicinal`, or `unknown`; optional `hsa_approval_claimed` |
| `electronic_cigarette` | `licensed_medicine_claimed`: explicitly true/false; optional `contains_nicotine` |
| `food` | `food_type`: `packaged_roasted_coffee`, `other`, or `unknown`; optional `prior_notice` |

Food `shipment` fields are `id`, `purpose`, `transport_mode`, `arrival_at`, and `arrival_timezone` (IANA zone of the first US port). `arrival_at` includes a UTC offset. Only `purpose: commercial_sale` and air/sea are evaluated. A known unmodeled food type, purpose, or transport mode returns `REVIEW` immediately, even when unrelated facts are missing. Otherwise, omitted prerequisites return `NEEDS_EVIDENCE`.

`prior_notice` contains `confirmation_number`, `confirmed_at`, `submission_method` (`pnsi` or `abi_ace`), and `evidence_id`. The filing clock starts at the declared FDA confirmation time. The modeled minimum is 4 hours for air or 8 hours for sea. Maximum windows are 15 calendar days for PNSI and 30 for ABI/ACE, compared in the declared arrival-port time zone. Future confirmations and past arrivals require review. A failed window blocks the proposed arrangement and requests lawful rescheduling/refiling.

Evidence records have unique `id`, `type`, `reference`, and `product` fields. FDA records also need `shipment_id` matching the proposed shipment. An omitted shipment binding returns `NEEDS_EVIDENCE` with the exact record field to supply; a supplied binding that conflicts with the proposed shipment returns `REVIEW`. Supported types: `product_specification`, `hsa_approval`, `medicinal_licence`, `fda_prior_notice`, `other`. Product labels must match, ignoring case. Evidence is not fetched or authenticated; callers cannot set `verified`. Complete filing contents and evidence authenticity remain unassessed.

Optional `origin_country` means manufacturing origin, independently of shipping country; no origin-specific restrictions are implemented. Optional `amount` remains transaction context and does not affect decisions.

Marketing calls require `action_type: marketing_email` and `recipient_country`; optional fields are `recipient_count` and `purpose`. Purchase/marketing fields cannot be mixed. Category-specific facts are checked for consistency. Unknown fields and duplicate evidence IDs reject.

### Country validation

Shipping, destination, origin, and recipient countries use the local `iso-3166` assigned-code dataset, pinned to `4.4.0`. Whitespace/lowercase normalize. Assigned codes such as `US`, `GB`, `HK`, `PR` are accepted. Names, three-letter codes, `ZZ`, `EU`, `UK`, and `XK` reject; use `GB` for the United Kingdom. Valid country codes do not imply regulatory coverage. Review assigned-code changes against [ISO guidance](https://www.iso.org/iso-3166-country-codes.html) when updating.

### Migration from 0.5

`budget` is removed and rejected with migration guidance. There is no spending-policy evaluation. Existing calls without `action_type` still work; missing category now requests information in implemented destination packs. The normalized `purchase` alias remains for purchase responses. Version 0.6.0 adds `CHECKS_PASSED`, structured finding/action fields, and coverage.

## Results and rechecking

Decision precedence: `BLOCK` > `NEEDS_EVIDENCE` > `REVIEW` > `CHECKS_PASSED`.

- `BLOCK`: a modeled prohibition or shipment condition fails.
- `NEEDS_EVIDENCE`: collect the named facts or records and recheck.
- `REVIEW`: an exception, evidence conflict, rule error, or coverage gap remains.
- `CHECKS_PASSED`: at least one applicable modeled rule was satisfied, with no unresolved finding among those checks. Conditional on supplied facts; not complete import clearance.

Requirements return status (`SATISFIED`, `MISSING`, `FAILED`, `REVIEW`, `NOT_APPLICABLE`), stable `reason_code`, explanation, missing fields, evidence references, source URL, legal reference, and source review date. Broken evaluators remain unresolved review findings. Empty and entirely inapplicable rule sets cannot pass.

`remediation_plan` steps include `requirement_id`, `kind`, `owner`, `instruction`, `required_fields`, and `evidence_types`. Kinds: `stop_action`, `request_information`, `collect_evidence`, `request_review`, `recheck_action`, `reschedule_or_refile`. Assignment does not authorize external execution. The calling agent uses its existing tools and actual updated records.

Coverage reports `evaluated_rule_ids`, `unassessed_topics`, `status: partial | none`, and `evidence_assurance: caller_supplied`. `get_requirements` does no evaluation, so discovery coverage is `none`; `supported` means a pack was selected. `advisory_only` is always true. `execution_performed` and the deprecated compatibility flag `can_proceed_under_checked_rules` always remain false, including after `CHECKS_PASSED`.

Demo: read the supplier specification and incomplete coffee fixture, call `check_action`, obtain the synthetic corrected confirmation, then resubmit. Missing notice findings resolve while remaining import requirements stay listed as unassessed.

## Policy routing and code map

`src/router/route.ts` selects by action type and countries, rejecting domestic purchases first. `src/engine.ts` runs rules and aggregates findings. `src/policy.ts` handles validation, context, coverage, fallback findings, and remediation. Product prohibitions and exceptions live inside packs.

```text
src/
  schemas.ts                  # MCP input/output and evidence contracts
  engine.ts                   # Rule execution and aggregation
  policy.ts                   # Shared assessment/discovery facade
  router/                     # Registry and destination selection
  policies/
    types.ts                  # PolicyPack and executable PolicyRule
    helpers.ts                # Finding/action and evidence helpers
    sg-import/                # pack, requirements, sources, rules
    in-import/                # pack, requirements, sources, rules
    us-import/                # pack, requirements, sources, rules
    general-purchase/         # Review fallback
    general-marketing/        # Review fallback
fixtures/                     # Synthetic purchases and evidence
scripts/demo.ts               # Reproducible evaluator demo
```

Extend coverage by adding a sourced rule to a pack. New destinations also need registry/router entries. Keep exceptions, review dates, and unassessed topics explicit. Runtime evaluation uses curated local rules rather than live legal searches.

## Sources

Reviewed 2026-10-17:

- [Singapore Customs controlled and prohibited imports](https://www.customs.gov.sg/doing-business/import-operations/import-procedures/controlled-and-prohibited-goods-for-imports/).
- [India Electronic Cigarettes Act, sections 3(d) and 4](https://www.indiacode.nic.in/bitstream/123456789/13078/1/A2019-42.pdf), with [government guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2205198&lang=1&reg=1).
- [21 CFR 1.277: scope and exemptions](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-I/section-1.277).
- [21 CFR 1.279: confirmation and filing windows](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-I/section-1.279).

## Deployment

Existing endpoint: https://bold-cloud-g95ht.run.mcp-use.com/mcp. Local changes do not update that deployment.

Deployment, when requested, runs from `mcp/`:

```bash
npx -y mcp-use@latest deploy --no-github -y
```

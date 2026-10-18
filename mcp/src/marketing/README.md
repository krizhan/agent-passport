# Marketing policy engine

`check_marketing_email` evaluates one rendered commercial email for one recipient. The input contract replaces the earlier country/count/purpose checklist. The engine combines candidate US CAN-SPAM, Canada CASL and UK PECR packs from recipient, sender and dispatch locations. Cross-border applicability, unsupported jurisdictions and noncommercial classifications remain explicit review items.

## Try locally

Start `npm run dev` from `mcp/`, and `npm run dev -- --port 5173` from `web/`. Open [the marketing editor](http://127.0.0.1:5173/marketing) or [MCP Inspector](http://localhost:3000/mcp/inspector).

The editor retrieves fresh synthetic examples from the MCP resource `marketing://examples` and sends checks to the real MCP tool through `/api/marketing/check`. It does not use a second evaluator. The editor's calls do not appear in Manufact gateway history; `/demo` shows actual captured gateway traffic. Server-side `MARKETING_MCP_URL` defaults to `http://127.0.0.1:3000/mcp` and can point to another running MCP endpoint.

Run `npm run demo:marketing` from `mcp/` to evaluate and export the 18 examples to [requests.json](requests.json). That file is a dated demonstration artifact; the MCP resource generates new observation/send timestamps for interactive use.

## Input and evidence

Required input groups are `sender`, `recipient`, `message`, and `planned_send_at`. Supply `dispatch_country` to establish the sending location. `message.text` is the actual rendered plain-text email, including its footer; optional HTML is also included in the message fingerprint. Recipient IDs are opaque references; the tool does not require a recipient email address. `evidence` may be omitted to discover evidence gaps.

Each evidence record carries `reference`, `source`, `observed_at`, `status` and `sender_id`. Recipient-specific records also carry `recipient_id`. The content-review, permission and unsubscribe records must carry the exact `message_sha256` returned by the tool.

To assess a new draft, first submit the draft and available records. Use the returned fingerprint when attaching reviews for that exact content. Changing the subject, headers, body, purpose or opt-out target changes the hash. Updating a hash does not perform a content or consent review: a reviewer or connected provider must substantiate the associated facts.

The engine checks record scope and freshness, but does not authenticate provenance labels or independently verify caller assertions. Human judgment about deceptive subjects, identification, consent standards and product similarity is supplied as explicit review facts. All examples are synthetic, including their consent events and functional-test claims.

| Evidence | Main facts | Maximum age at assessment or planned send |
| --- | --- | --- |
| `sender_profile` | Identity and postal/contact confirmation, contact validity | 30 days |
| `content_review` | Exact message hash, reviewer, header/subject accuracy, disclosures, opt-out clarity, own similar products | 30 days |
| `permission` | Sender/recipient/message scope, email channel, selected basis, grant/event dates, withdrawals and applicable consent/collection conditions | 24 hours since retrieval |
| `suppression` | Sender/recipient scope, suppression flag, all configured sources checked | 15 minutes |
| `unsubscribe` | Exact target and message, functional controlled test/configuration, simplicity, cost/login behavior, availability and processing settings | 24 hours |
| `subscriber` | Evidenced UK individual/corporate classification | 30 days |

These are application freshness thresholds. They do not expire the underlying consent event. A record observed in the future, an unavailable source, a scope/hash mismatch or an incomplete search remains unknown. A past planned send requires historical review. A send near an implied-consent calendar boundary requires timezone/date review.

## Policy coverage

- US: sender/header and subject review, postal address in the plain-text body, advertising identification or an evidenced affirmative-consent exception, opt-out mechanism, availability and processing settings. No general prior opt-in requirement is imposed by this pack.
- Canada: identification/contact and unsubscribe checks, express consent, selected purchase-based implied consent (24 calendar months), and selected inquiry-based implied consent (6 calendar months). Express consent has no automatic expiry. Other exemptions, publication-based consent, non-business relationships and specialized cases require separate review.
- UK: evidenced subscriber classification; corporate-subscriber treatment; individual consent, a specific solicited message, or all implemented commercial soft-opt-in conditions. Charitable soft-opt-in, other privacy duties and specialized cases require separate review.
- Application policies: hold a suppressed recipient or an evidenced withdrawal; require complete and current source coverage before treating suppression as clear.

Official source URLs and review dates are returned with the result. Legal rules are versioned in code; the tool does not retrieve guidance on each assessment.

## Results and rechecks

`BLOCK` means a supplied draft or record fails a checked condition. `NEEDS_EVIDENCE` means a required fact is not established. `REVIEW` covers judgment, classification or jurisdiction gaps. `NO_BLOCKERS_FOUND` means the implemented checks are satisfied by supplied evidence within the reported coverage.

Results contain rule findings, evidence references and freshness checks, missing information, source links, remediation, the exact message fingerprint and proposed corrections. Address corrections are proposed only when the supplied sender profile confirms that address. Opt-out corrections use supplied operational evidence. Corrections are never applied or sent automatically.

Every result retains `advisory_only: true`, `can_proceed_under_checked_rules: false`, `execution_performed: false`, and `live_lookup_performed: false`. Recheck the revised final message and refresh suppression near the actual send.

## Integration boundaries

The MVP consumes records supplied in the request. No credentials or backend are required. Future read-only adapters should return these same typed records and distinguish a complete empty search from an unavailable/partial search.

| Proposed adapter | Source | Read operations |
| --- | --- | --- |
| Sender and draft | Existing email platform / company profile | Sender configuration, confirmed organization details, exact rendered draft |
| Permission | Consent store / CRM | Original consent event and wording, channel/sender/purpose scope, withdrawal history |
| Customer relationship | CRM / commerce platform | Purchase or inquiry dates, collection forms/events, original collection-time opt-out |
| Suppression | Email platform and internal preference stores | Current recipient/channel/sender suppression across configured sources |
| Unsubscribe | Email platform / controlled synthetic-recipient test | Target configuration, functional-test evidence, availability and processing settings |
| Policy maintenance | FTC, CRTC and ICO | Reviewed guidance for versioned rule updates |

Adapters should use account-scoped credentials on the server, return retrieval timestamps and source references, and fetch only records belonging to that account. Do not activate a real recipient's unsubscribe link as a health check. No live provider adapters are enabled in this version.

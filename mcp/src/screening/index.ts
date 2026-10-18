import { restrictedPartySchema, screeningInputSchema, type ScreeningInput, type RequirementResult } from "../schemas.js";
import { restrictedPartyPolicy } from "../policies/us-restricted-party/pack.js";
import { sources } from "../policies/us-restricted-party/sources.js";
import { routeAction } from "../router/route.js";
import { findCandidates, MATCH_THRESHOLD } from "./match.js";
import { screeningEvaluationSchema, type ScreeningResult } from "./schemas.js";
import { loadSnapshot, ScreeningSourceError } from "./source.js";

export { screeningEvaluationSchema } from "./schemas.js";

export async function screenRestrictedParty(raw: ScreeningInput, options: { fetcher?: typeof fetch; signal?: AbortSignal } = {}) {
  const input = screeningInputSchema.parse(raw);
  const action = restrictedPartySchema.parse({ ...input, action_type: "restricted_party_screening" });
  const route = routeAction(action);
  const screening: ScreeningResult = {
    status: "UNAVAILABLE",
    source: { name: "U.S. Consolidated Screening List", url: sources.download, retrieved_at: null,
      dataset_generated_at: null, http_last_modified: null, sha256: null, records_screened: 0, lists: [] },
    matching: { method: "normalized_names_aliases_tokens_bigrams/v1", threshold: MATCH_THRESHOLD, country_filter_applied: false },
    matches: [], total_matches: 0, truncated: false, error: null,
    limitations: [
      "U.S. CSL coverage only. This is not global sanctions or transaction clearance.",
      "Name similarity scores are heuristic retrieval scores, not identity probabilities. No transliteration or verified identifier matching is implemented; candidates can be missed.",
      "Country and address are review context; country does not filter candidates and addresses are not automatically verified.",
      "Ownership/control rules, unlisted restricted parties, end-use, end-user, country restrictions, and licenses require separate review.",
      "Verify candidates against original agency records. Results apply only to the downloaded snapshot and submitted names; re-screen before acting if either changes.",
    ],
  };
  try {
    const snapshot = await loadSnapshot(options.fetcher, options.signal);
    Object.assign(screening, findCandidates(action, snapshot.dataset.results));
    screening.status = screening.total_matches ? "POTENTIAL_MATCH" : "NO_CANDIDATES";
    screening.source = {
      ...screening.source, retrieved_at: snapshot.retrievedAt, dataset_generated_at: snapshot.dataset.search_performed_at,
      http_last_modified: snapshot.lastModified, sha256: snapshot.sha256,
      records_screened: snapshot.dataset.results.length, lists: snapshot.dataset.sources_used,
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    screening.error = error instanceof ScreeningSourceError ? error.message
      : "Could not retrieve or process the official CSL within the supported limits; screening was not completed. Retry before relying on a result.";
  }
  const unavailable = screening.status === "UNAVAILABLE";
  const requirements: RequirementResult[] = restrictedPartyPolicy.requirements.map((requirement) => {
    let status: RequirementResult["status"] = "REVIEW", detail: string = requirement.description;
    if (requirement.id === "csl_availability") {
      status = unavailable ? "MISSING" : "SATISFIED";
      detail = unavailable ? screening.error! : `Screened ${screening.source.records_screened} records from ${screening.source.lists.length} declared sources; CSL generated ${screening.source.dataset_generated_at}.`;
    } else if (requirement.id === "party_name_screening") {
      status = unavailable ? "MISSING" : screening.total_matches ? "REVIEW" : "SATISFIED";
      detail = unavailable ? "Name screening was not completed because current complete data could not be established."
        : screening.total_matches ? `Found ${screening.total_matches} candidate records; returning ${screening.matches.length}. Resolve possible identities and restrictions before proceeding.`
        : "No candidates met this heuristic search's threshold. This does not establish that the party or transaction is unrestricted.";
    }
    return { ...requirement, status, detail };
  });
  return screeningEvaluationSchema.parse({
    action, advisory_only: true, policy_version: `${restrictedPartyPolicy.id}/${restrictedPartyPolicy.version}`,
    scope: restrictedPartyPolicy.scope, routing: route.routing, assessed_at: new Date().toISOString(),
    decision: unavailable ? "NEEDS_EVIDENCE" : "REVIEW",
    summary: unavailable ? "Restricted-party screening could not be completed. No no-match conclusion is available."
      : screening.total_matches ? "Possible restricted-party matches require identity and agency-specific restriction review."
      : "No candidates were found in this U.S. CSL name search. Wider transaction compliance still requires review.",
    requirements, screening,
    remediation_plan: requirements.filter((item) => item.status !== "SATISFIED").map((item) => ({
      requirement_id: item.id, owner: item.status === "MISSING" ? "agent" : "human", instruction: item.detail,
    })),
    can_proceed_under_checked_rules: false, execution_performed: false,
  });
}

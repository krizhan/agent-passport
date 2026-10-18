import type { RestrictedParty } from "../schemas.js";
import type { Candidate, CSLRecord } from "./schemas.js";

export const MATCH_THRESHOLD = 0.85 as const;
export const MAX_MATCHES = 20;

export function normalizeName(name: string) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function bigrams(text: string) {
  const pairs = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  return pairs;
}

function dice(a: string, b: string) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  // Even complete bigram overlap cannot reach the threshold at these lengths.
  if (2 * (Math.min(a.length, b.length) - 1) / (a.length + b.length - 2) < MATCH_THRESHOLD) return 0;
  const left = bigrams(a), right = bigrams(b);
  let overlap = 0;
  for (const [pair, count] of left) overlap += Math.min(count, right.get(pair) ?? 0);
  return 2 * overlap / (a.length + b.length - 2);
}

function compare(query: string, candidate: string): { score: number; method: Candidate["match_method"] } {
  if (query === candidate) return { score: 1, method: "exact" };
  const a = query.split(" ").sort(), b = candidate.split(" ").sort();
  if (a.join(" ") === b.join(" ")) return { score: 1, method: "token_order" };
  const shorter = a.length <= b.length ? a : b, longer = a.length <= b.length ? b : a;
  if ((shorter.length >= 2 || shorter[0].length >= 4) && shorter.every((token) => longer.includes(token))) {
    return { score: 0.9, method: "token_subset" };
  }
  return { score: Math.max(dice(a.join(" "), b.join(" ")), dice(query.replaceAll(" ", ""), candidate.replaceAll(" ", ""))), method: "bigram_similarity" };
}

export function findCandidates(action: RestrictedParty, records: CSLRecord[]) {
  const queries = [action.name, ...action.aliases].map((name) => ({ name, normalized: normalizeName(name) }));
  const matches: Candidate[] = [];
  for (const record of records) {
    let best: { query: string; name: string; score: number; method: Candidate["match_method"] } | undefined;
    for (const name of [record.name, ...(record.alt_names ?? [])]) {
      const normalized = normalizeName(name);
      if (!normalized) continue;
      for (const query of queries) {
        const match = compare(query.normalized, normalized);
        if (match.score >= MATCH_THRESHOLD && (!best || match.score > best.score)) {
          best = { query: query.name, name, ...match };
        }
      }
    }
    if (!best) continue;
    const countries = [...new Set([record.country, ...(record.addresses ?? []).map((entry) => entry.country)]
      .filter((value): value is string => !!value).map((value) => value.toUpperCase()))];
    matches.push({
      id: record.id, name: record.name, source: record.source,
      matched_query: best.query, matched_name: best.name, match_method: best.method,
      similarity_score: Math.round(best.score * 10000) / 10000,
      country_match: !action.country ? "NOT_SUPPLIED" : !countries.length ? "UNKNOWN"
        : countries.includes(action.country) ? "MATCH" : "DIFFERENT",
      countries, addresses: (record.addresses ?? []).map((entry) =>
        [entry.address, entry.city, entry.state, entry.postal_code, entry.country].filter(Boolean).join(", ")),
      programs: record.programs ?? [], source_list_url: record.source_list_url ?? null,
      source_information_url: record.source_information_url ?? null,
      remarks: record.remarks ?? null, license_requirement: record.license_requirement ?? null,
    });
  }
  matches.sort((a, b) => b.similarity_score - a.similarity_score || a.id.localeCompare(b.id));
  return { matches: matches.slice(0, MAX_MATCHES), total_matches: matches.length, truncated: matches.length > MAX_MATCHES };
}

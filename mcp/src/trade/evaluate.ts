import { screenRestrictedParty } from "../screening/index.js";
import type { ScreeningInput } from "../schemas.js";
import type { ScreeningResult } from "../screening/schemas.js";
import { evaluateCondition, fieldValue, isMissing } from "./conditions.js";
import { jurisdictionFor, tradeRules, TRADE_POLICY_VERSION } from "./registry.js";
import { tradeEvaluationSchema, tradeInputSchema, type TradeEvaluation } from "./schemas.js";
import type { Direction, LegalSource, TradeInput, TradeRule } from "./types.js";

export interface EvaluationOptions {
  now?: Date;
  signal?: AbortSignal;
  rules?: readonly TradeRule[];
  screenParty?: (party: ScreeningInput, signal?: AbortSignal) => Promise<ScreeningResult>;
}

function inJurisdiction(rule: TradeRule, input: TradeInput): boolean {
  if (rule.jurisdiction === "GLOBAL") return true;
  const usReexport = input.transaction_type === "reexport"
    && (input.origin_country === "US" || input.technical_specifications?.subject_to_ear === true);
  const countries = rule.direction === "import" ? [input.to_country]
    : rule.direction === "export" ? [input.from_country, ...(usReexport ? ["US"] : [])]
    : rule.direction === "transit" ? input.transit_countries
    : [input.from_country, input.to_country, ...input.transit_countries, ...(usReexport ? ["US"] : [])];
  return countries.some((country) => jurisdictionFor(country) === rule.jurisdiction);
}

const sourceKey = (source: LegalSource) => `${source.url}/${source.verified_as_of}/${source.verification_status}`;

export async function checkImportExport(raw: unknown, options: EvaluationOptions = {}): Promise<TradeEvaluation> {
  options.signal?.throwIfAborted();
  const input = tradeInputSchema.parse(raw);
  const now = options.now ?? new Date();
  const plannedDate = input.planned_date ?? now.toISOString().slice(0, 10);
  const rules = options.rules ?? tradeRules;
  const findings: TradeEvaluation["findings"] = { import: [], export: [], transit: [], screening: [], general: [] };
  const evaluations: TradeEvaluation["rule_evaluations"] = [];
  const missing = new Map<string, Set<string>>();
  const documents = new Map<string, TradeEvaluation["required_documents"][number]>();
  const steps: TradeEvaluation["remediation_plan"] = [];
  const sources = new Map<string, LegalSource>();
  const addMissing = (field: string, id: string) => {
    const ids = missing.get(field) ?? new Set<string>(); ids.add(id); missing.set(field, ids);
  };
  const domestic = input.from_country === input.to_country && input.transit_countries.every((country) => country === input.from_country);
  for (const rule of rules) {
    if (!inJurisdiction(rule, input) || (domestic && rule.jurisdiction !== "GLOBAL")) continue;
    const base = { rule_id: rule.id, rule_version: rule.version, jurisdiction: rule.jurisdiction, direction: rule.direction };
    if ((rule.transaction_types && !rule.transaction_types.includes(input.transaction_type))
      || (rule.categories && input.product_category && !rule.categories.includes(input.product_category))) {
      evaluations.push({ ...base, outcome: "NOT_MATCHED", missing_fields: [] }); continue;
    }
    // Half-open effective interval: effective_from <= transaction date < effective_to.
    if ((rule.legal_effective_from && plannedDate < rule.legal_effective_from)
      || (rule.legal_effective_to && plannedDate >= rule.legal_effective_to)) {
      evaluations.push({ ...base, outcome: "NOT_EFFECTIVE", missing_fields: [] }); continue;
    }
    const categoryUnknown = Boolean(rule.categories && !input.product_category);
    const evaluatedCondition = evaluateCondition(rule.conditions, input);
    if (evaluatedCondition.status === "NOT_MATCHED") {
      evaluations.push({ ...base, outcome: "NOT_MATCHED", missing_fields: [] }); continue;
    }
    const condition = categoryUnknown ? { status: "UNKNOWN" as const, missing: ["product_category"] } : evaluatedCondition;
    const required = categoryUnknown ? ["product_category"] : rule.required_inputs;
    const missingFields = [...new Set([...condition.missing, ...required.filter((field) => isMissing(fieldValue(input, field)))])];
    const outcome = condition.status === "UNKNOWN" || missingFields.length > 0 ? "UNKNOWN" as const : "MATCHED" as const;
    evaluations.push({ ...base, outcome, missing_fields: missingFields });
    missingFields.forEach((field) => addMissing(field, rule.id));
    rule.sources.forEach((source) => sources.set(sourceKey(source), source));
    const ruleDocs = categoryUnknown ? [] : rule.required_documents;
    for (const type of ruleDocs) {
      const supplied = input.documents.filter((doc) => doc.type === type);
      const valid = supplied.filter((doc) => !doc.expires_on || doc.expires_on >= plannedDate);
      const existing = documents.get(type);
      documents.set(type, { type, status: valid.length ? "PROVIDED_UNVERIFIED" : supplied.length ? "EXPIRED" : "MISSING",
        references: supplied.map((doc) => doc.reference), rule_ids: [...new Set([...(existing?.rule_ids ?? []), rule.id])] });
    }
    findings[rule.direction].push({ ...base, title: rule.title, condition_status: outcome,
      code: categoryUnknown ? "CLASSIFICATION_REQUIRED"
        : outcome === "UNKNOWN" && (rule.finding === "PROHIBITED" || rule.finding === "LICENSE_REQUIRED") ? "HUMAN_REVIEW_REQUIRED" : rule.finding,
      detail: rule.explanation, missing_fields: missingFields, required_documents: [...ruleDocs], sources: [...rule.sources] });
    steps.push(...rule.remediation_steps.map((step) => ({ ...step, requirement_id: rule.id })));
  }

  const unsupported: TradeEvaluation["coverage"]["unsupported"] = [];
  const sides: { country: string; direction: Direction }[] = [
    { country: input.from_country, direction: "export" }, { country: input.to_country, direction: "import" },
    ...input.transit_countries.map((country) => ({ country, direction: "transit" as const })),
  ];
  for (const side of sides) {
    const supported = !domestic && evaluations.some((entry) => entry.jurisdiction === jurisdictionFor(side.country)
      && entry.direction === side.direction && (entry.outcome === "MATCHED" || entry.outcome === "UNKNOWN"));
    if (!supported) unsupported.push({ ...side, reason: domestic
      ? "Same-country movements require domestic or in-country transfer review; international scenario packs do not cover this movement."
      : `No active ${side.direction} scenario rule matches this category/transaction for ${side.country}. Obtain jurisdiction-specific review.` });
  }
  if (input.transaction_type === "transit" && !input.transit_countries.length) addMissing("transit_countries", "coverage.transit");
  if (unsupported.length) steps.push({ requirement_id: "coverage", owner: "human", instruction: unsupported.map((side) => `${side.country} ${side.direction}: ${side.reason}`).join(" ") });

  const screening: TradeEvaluation["screening"] = [];
  const screen = options.screenParty ?? (async (party: ScreeningInput, signal?: AbortSignal) => (await screenRestrictedParty(party, { signal })).screening);
  // Process parties sequentially to bound CPU and memory when matching the full snapshot.
  for (const party of input.parties) {
    options.signal?.throwIfAborted();
    const { role, ...query } = party;
    const result = await screen(query, options.signal);
    screening.push({ party_name: party.name, party_role: role, result });
    const ruleId = `screening.${screening.length}`;
    const unavailable = result.status === "UNAVAILABLE" || result.source.freshness !== "RECENT";
    if (unavailable) addMissing("current_screening_snapshot", ruleId);
    const detail = result.status === "UNAVAILABLE" ? result.error ?? "The bundled CSL snapshot could not be validated."
      : `${result.total_matches} possible candidate records for ${party.name}. Snapshot generated ${result.source.dataset_generated_at}; freshness ${result.source.freshness}. This U.S. name search does not establish identity or transaction clearance.`;
    findings.screening.push({ rule_id: ruleId, rule_version: "bundled-csl/1", jurisdiction: "US", direction: "screening", title: `U.S. CSL: ${party.name}`,
      code: "RESTRICTED_PARTY_REVIEW", condition_status: unavailable ? "UNKNOWN" : "MATCHED", detail,
      missing_fields: unavailable ? ["current_screening_snapshot"] : [], required_documents: [], sources: [
        { title: "U.S. Consolidated Screening List", url: "https://www.trade.gov/consolidated-screening-list", verified_as_of: "2026-10-17", verification_status: "verified_guidance" },
      ] });
    steps.push({ requirement_id: ruleId, owner: unavailable ? "agent" : "human", instruction: unavailable
      ? "Refresh and redeploy the bundled CSL snapshot, then re-screen before relying on current list coverage. Historical candidates remain visible."
      : result.total_matches ? "Resolve candidate identity using agency records and identifiers, then determine the actual list/program restrictions and authorization."
      : "Review ownership, sectoral/country restrictions, end-use and relevant non-U.S. lists; an empty U.S. name search does not clear the transaction." });
  }

  const allFindings = Object.values(findings).flat();
  const requiredDocuments = [...documents.values()];
  const budgetStatus = input.budget === undefined ? "NOT_CHECKED" : input.amount === undefined ? "MISSING_AMOUNT"
    : input.amount > input.budget ? "OVER_BUDGET" : "WITHIN_BUDGET";
  if (budgetStatus === "MISSING_AMOUNT") addMissing("amount", "purchase_budget");
  const confirmedBlock = allFindings.some((finding) => finding.code === "PROHIBITED" && finding.condition_status === "MATCHED");
  const needsEvidence = missing.size > 0 || requiredDocuments.some((doc) => doc.status !== "PROVIDED_UNVERIFIED");
  const decision = confirmedBlock || budgetStatus === "OVER_BUDGET" ? "BLOCK" : needsEvidence ? "NEEDS_EVIDENCE" : "REVIEW";
  const requirements: TradeEvaluation["requirements"] = allFindings.map((finding) => ({
    id: finding.rule_id, title: finding.title, basis: "legal_readiness", source_url: finding.sources[0]?.url ?? null,
    description: finding.detail, status: finding.code === "PROHIBITED" && finding.condition_status === "MATCHED" ? "FAILED"
      : finding.missing_fields.length ? "MISSING" : "REVIEW",
    detail: `${finding.code}: ${finding.detail}${finding.missing_fields.length ? ` Missing: ${finding.missing_fields.join(", ")}.` : ""}`,
  }));
  if (input.budget !== undefined) {
    const detail = budgetStatus === "MISSING_AMOUNT" ? "Supply amount in the same currency and units as budget."
      : budgetStatus === "OVER_BUDGET" ? "The submitted purchase total exceeds your submitted budget. This is a caller constraint, not a legal prohibition."
      : "The submitted total is within your submitted budget; this does not establish trade compliance.";
    requirements.push({ id: "purchase_budget", title: "Your purchase budget", basis: "purchase_constraint", source_url: null,
      description: "Compare the caller-supplied amount and budget without currency conversion.",
      status: budgetStatus === "MISSING_AMOUNT" ? "MISSING" : budgetStatus === "OVER_BUDGET" ? "FAILED" : "SATISFIED", detail });
    if (budgetStatus !== "WITHIN_BUDGET") steps.push({ requirement_id: "purchase_budget", owner: "agent",
      instruction: budgetStatus === "MISSING_AMOUNT" ? detail : "Revise the purchase amount or budget and submit a fresh assessment." });
  }
  for (const doc of requiredDocuments) {
    requirements.push({ id: `document.${doc.type}`, title: doc.type.replaceAll("_", " "), basis: "legal_readiness",
      source_url: allFindings.find((finding) => finding.required_documents.includes(doc.type))?.sources[0]?.url ?? null,
      description: "Potentially applicable supporting document; scope and authorization require review.",
      status: doc.status === "PROVIDED_UNVERIFIED" ? "REVIEW" : "MISSING",
      detail: `${doc.status}: ${doc.references.join(", ") || "No reference supplied"}. Review applicability, issuer, scope, validity and conditions; a supplied document does not automatically satisfy the rule.` });
    steps.push({ requirement_id: `document.${doc.type}`, owner: doc.status === "PROVIDED_UNVERIFIED" ? "human" : "agent",
      instruction: `${doc.status === "PROVIDED_UNVERIFIED" ? "Validate" : doc.status === "EXPIRED" ? "Renew or replace" : "Determine applicability and obtain"} ${doc.type.replaceAll("_", " ")} for the planned transaction.` });
  }
  for (const side of unsupported) requirements.push({ id: `coverage.${side.country}.${side.direction}`, title: `${side.country} ${side.direction} coverage`,
    basis: "assessment_input", source_url: null, description: side.reason, status: "REVIEW", detail: side.reason });
  for (const finding of allFindings) finding.sources.forEach((source) => sources.set(sourceKey(source), source));
  const applied = evaluations.filter((entry) => entry.outcome === "MATCHED" || entry.outcome === "UNKNOWN");
  options.signal?.throwIfAborted();
  return tradeEvaluationSchema.parse({
    action: { ...input, action_type: "import_export" }, assessed_at: now.toISOString(), planned_date: plannedDate,
    policy_version: TRADE_POLICY_VERSION, decision,
    purchase_constraint: { amount: input.amount ?? null, budget: input.budget ?? null, status: budgetStatus },
    summary: `${allFindings.length} findings across ${new Set(applied.map((entry) => entry.jurisdiction)).size} rule jurisdictions. ${missing.size} input/evidence gaps; ${requiredDocuments.filter((doc) => doc.status !== "PROVIDED_UNVERIFIED").length} missing or expired document types; ${unsupported.length} unsupported route sides. ${confirmedBlock ? "A matched prohibition requires resolution." : budgetStatus === "OVER_BUDGET" ? "The purchase exceeds your submitted budget; this is a caller constraint, not a legal prohibition." : "Review findings and authorization before acting."}`,
    scope: "Hardcoded scenario-level import/export advisory checks. Categories, classifications and documents are caller-supplied; no full legal clearance or business execution is provided.",
    routing: { policy_id: "hardcoded-trade", kind: "composed", reason: "Combine applicable origin/export, destination/import, transit and shared evidence rules. EU member countries map to the EU pack; national overlays remain review items." },
    advisory_only: true, can_proceed_under_checked_rules: false, execution_performed: false,
    findings, rule_evaluations: evaluations, requirements,
    coverage: { scope: "scenario_level", full_transaction_coverage: false,
      rule_packs: [...new Set(applied.map((entry) => `${entry.jurisdiction}/${entry.direction}`))],
      checked_jurisdictions: [...new Set(applied.map((entry) => entry.jurisdiction))], evaluated_rule_count: evaluations.length,
      unsupported, limitations: [
        "Hardcoded rules are a dated, partial guidance catalog, not exhaustive commodity measures or a universal whitelist. Verify currently effective legal text before acting.",
        "Supplied categories, technical flags, classifications, ownership percentages and documents are not independently verified. License scope and exception conditions require human review.",
        "EU packs do not implement every Member State overlay; Northern Ireland, special territories and customs arrangements require separate review.",
        "Transit, foreign-direct-product, de minimis, indirect ownership, quotas/balances, tariffs/duties and emergency measures are not fully resolved.",
        "Party screening is an offline U.S. CSL name search; snapshot dates, match limitations and unsupported non-U.S. coverage remain explicit.",
      ] },
    missing_information: [...missing].map(([field, ids]) => ({ field, reason: `Supply or confirm ${field} to resolve the applicable rule conditions.`, rule_ids: [...ids] })),
    required_documents: requiredDocuments, screening, sources: [...sources.values()],
    remediation_plan: steps.filter((step, index, all) => all.findIndex((other) => other.requirement_id === step.requirement_id && other.instruction === step.instruction) === index),
  });
}

import { useEffect, useMemo, useRef, useState } from "react";
import scenarioData from "../generated/trade-scenarios.json";
import { Icon, Logo } from "./ui.tsx";
import "../scenarios.css";

type Direction = "import" | "export" | "transit" | "screening" | "general";
type Source = { title: string; url: string; verified_as_of: string | null; verification_status: string };
type Finding = {
  rule_id: string; rule_version: string; jurisdiction: string; direction: Direction; title: string;
  code: string; condition_status: "MATCHED" | "UNKNOWN"; detail: string;
  missing_fields: string[]; required_documents: string[]; sources: Source[];
  check?: { status: "SATISFIED" | "MISSING" | "FAILED" | "REVIEW"; reason_code: string; evidence_refs: string[] };
};
type Scenario = {
  id: string; title: string;
  input: {
    product: string; product_category?: string; from_country: string; to_country: string; origin_country?: string;
    transit_countries?: string[]; transaction_type?: string; control_classification?: string;
    classification_evidence?: string; end_user?: string; end_use?: string; hs_code?: string;
    [key: string]: unknown;
  };
  result: {
    assessed_at: string; planned_date: string; decision: "BLOCK" | "NEEDS_EVIDENCE" | "REVIEW"; summary: string;
    findings: Finding[];
    coverage: { rule_packs: string[]; checked_jurisdictions: string[]; full_transaction_coverage: boolean;
      unsupported: { country: string; direction: Direction; reason: string }[]; limitations: string[] };
    missing_information: { field: string; reason: string; rule_ids: string[] }[];
    required_documents: { type: string; status: "MISSING" | "PROVIDED_UNVERIFIED" | "EXPIRED"; references: string[]; rule_ids: string[] }[];
    remediation_plan: { owner: "human" | "agent"; instruction: string; requirement_id?: string }[];
    sources: Source[];
    screening: { party_name: string; party_role: string; status: string; total_matches: number; error?: string | null;
      source: { dataset_generated_at: string | null; freshness: string; records_screened: number };
      matches: { id: string; name: string; source: string; source_information_url: string | null; source_list_url: string | null }[] }[];
  };
};
// Keep imported JSON from expanding into thousands of inferred literal fields.
const catalog = scenarioData as unknown as { generated_at: string; rule_count: number; scenarios: Scenario[] };
const directions: Direction[] = ["import", "export", "transit", "screening", "general"];
const directionLabels: Record<Direction, string> = {
  import: "Import", export: "Export", transit: "Transit", screening: "Party screening", general: "Shared checks",
};
const decisionLabels = { BLOCK: "Blocked", NEEDS_EVIDENCE: "Needs evidence", REVIEW: "Review required" };
const names = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => names.of(code) ?? code;
const readable = (value: string) => value.replaceAll("_", " ").replaceAll(".", " / ");
const dateLabel = (value: string) => new Date(value).toLocaleString("en-US", {
  timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});

function Decision({ value }: { value: Scenario["result"]["decision"] }) {
  return <span className={`scenario-decision scenario-decision-${value.toLowerCase()}`}><span />{decisionLabels[value]}</span>;
}

function FindingCard({ finding }: { finding: Finding }) {
  const potential = finding.condition_status === "UNKNOWN";
  return <article className={`scenario-finding${potential ? " scenario-finding-potential" : ""}`}>
    <div className="scenario-finding-top"><span className="scenario-code">{readable(finding.code)}</span>
      <span className={`scenario-condition${potential ? " scenario-condition-unknown" : ""}`}>{potential ? "Potential · missing information" : "Matched scenario"}</span></div>
    <h4>{finding.title}</h4>
    {finding.check && <p><strong>Check: {readable(finding.check.status.toLowerCase())}</strong></p>}
    <p>{finding.detail}</p>
    {potential && <p className="scenario-potential-note">Applicability is unresolved. This finding is not confirmed.</p>}
    {finding.missing_fields.length > 0 && <div className="scenario-field-tags" aria-label="Missing fields">{finding.missing_fields.map(field => <span key={field}>{readable(field)}</span>)}</div>}
    <div className="scenario-finding-footer"><code>{finding.rule_id} · v{finding.rule_version}</code><span>{finding.jurisdiction}</span></div>
    {finding.sources.length > 0 && <div className="scenario-finding-sources">{finding.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="arrow" size={12} /></a>)}</div>}
  </article>;
}

function ScenarioDetail({ scenario }: { scenario: Scenario }) {
  const { input, result } = scenario;
  const [branch, setBranch] = useState<Direction | "all">("all");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">("idle");
  const fallback = useRef<HTMLTextAreaElement>(null);
  const inputJson = JSON.stringify(input, null, 2);
  const unknownCount = result.findings.filter(finding => finding.condition_status === "UNKNOWN").length;

  useEffect(() => {
    if (copyState === "fallback") { fallback.current?.focus(); fallback.current?.select(); }
  }, [copyState]);

  async function copyInput() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(inputJson);
      setCopyState("copied");
    } catch { setCopyState("fallback"); }
  }

  return <article className="scenario-detail" aria-labelledby="selected-scenario-title">
    <div className="scenario-detail-heading">
      <div><span className="scenario-kicker"><Icon name="file" size={13} /> Precomputed evaluator result</span><h2 id="selected-scenario-title">{scenario.title}</h2></div>
      <Decision value={result.decision} />
    </div>
    <div className="scenario-route"><span>{countryName(input.from_country)} <small>{input.from_country}</small></span><Icon name="arrow" size={22} /><span>{countryName(input.to_country)} <small>{input.to_country}</small></span></div>
    <p className="scenario-product">{input.product}</p>
    <div className="scenario-request-tags"><span>{readable(input.product_category ?? "Category not supplied")}</span><span>{readable(input.transaction_type ?? "shipment")}</span>{input.transit_countries?.length ? <span>Via {input.transit_countries.map(countryName).join(", ")}</span> : null}</div>
    <div className="scenario-timestamps"><span><Icon name="clock" size={14} /> Evaluated <time dateTime={result.assessed_at}>{dateLabel(result.assessed_at)}</time></span><span>Planned date: {result.planned_date}</span></div>
    <p className="scenario-recorded-note">A saved run of the MCP evaluator against this example input. Selecting an example does not run a new check or execute a transaction.</p>

    <div className="scenario-summary"><Icon name="shield" size={20} /><div><strong>{unknownCount > 0 ? `${unknownCount} potential ${unknownCount === 1 ? "finding needs" : "findings need"} more information` : "Review the recorded findings before acting"}</strong><p>{result.summary}</p></div></div>

    <section className="scenario-section" aria-labelledby="scenario-request-title">
      <div className="scenario-section-heading"><h3 id="scenario-request-title">The request</h3><button className="scenario-copy" onClick={() => void copyInput()}><Icon name={copyState === "copied" ? "check" : "file"} size={14} />{copyState === "copied" ? "Input copied" : "Copy MCP input JSON"}</button></div>
      <dl className="scenario-facts">
        <div><dt>Manufacturing origin</dt><dd>{input.origin_country ? countryName(input.origin_country) : "Not supplied"}</dd></div>
        <div><dt>HS code</dt><dd>{input.hs_code ?? "Not supplied"}</dd></div>
        <div><dt>Control classification</dt><dd>{input.control_classification ?? "Not supplied"}</dd></div>
        <div><dt>End user</dt><dd>{input.end_user ?? "Not supplied"}</dd></div>
        <div className="scenario-fact-wide"><dt>Intended use</dt><dd>{input.end_use ?? "Not supplied"}</dd></div>
      </dl>
      <p className="scenario-copy-status" role="status">{copyState === "copied" ? "JSON copied. Paste it into check_import_export in the MCP Inspector." : copyState === "fallback" ? "Clipboard access is unavailable. Select and copy the JSON below." : ""}</p>
      {copyState === "fallback" && <div className="scenario-copy-fallback"><label htmlFor="scenario-copy-json">MCP input JSON — select and copy</label><textarea id="scenario-copy-json" ref={fallback} value={inputJson} readOnly rows={9} onFocus={event => event.currentTarget.select()} /></div>}
      <details className="scenario-json"><summary>View full MCP input</summary><pre>{inputJson}</pre></details>
    </section>

    <section className="scenario-section" aria-labelledby="scenario-findings-title">
      <div className="scenario-section-heading"><h3 id="scenario-findings-title">Findings</h3><span className="scenario-section-count">{result.findings.length} recorded</span></div>
      <div className="scenario-branches" role="group" aria-label="Filter finding branch">
        <button aria-pressed={branch === "all"} onClick={() => setBranch("all")}>All <span>{result.findings.length}</span></button>
        {directions.map(direction => <button key={direction} aria-pressed={branch === direction} onClick={() => setBranch(direction)}>{directionLabels[direction]} <span>{result.findings.filter(finding => finding.direction === direction).length}</span></button>)}
      </div>
      {directions.filter(direction => branch === "all" || branch === direction).map(direction => {
        const findings = result.findings.filter(finding => finding.direction === direction);
        return <section className="scenario-branch" key={direction} aria-label={`${directionLabels[direction]} findings`}><h4 className="scenario-branch-title">{directionLabels[direction]} <span>{findings.length}</span></h4>
          {findings.length > 0 ? <div className="scenario-finding-grid">{findings.map(finding => <FindingCard finding={finding} key={finding.rule_id} />)}</div> : <p className="scenario-empty-branch">No findings recorded in this branch. Check coverage below.</p>}
        </section>;
      })}
    </section>

    {result.screening.length > 0 && <section className="scenario-section" aria-labelledby="scenario-screening-title"><div className="scenario-section-heading"><h3 id="scenario-screening-title">Bundled U.S. party screening</h3><span className="scenario-section-count">Offline snapshot</span></div><p className="scenario-section-note">Candidates require identity review. This name search does not clear a transaction or cover other countries’ lists.</p>
      {result.screening.map((screen, index) => <article className="scenario-screening" key={`${screen.party_name}-${index}`}><h4>{screen.party_name} <span>{readable(screen.party_role)}</span></h4><p>{readable(screen.status)} · {screen.total_matches} candidate records</p><p>Snapshot: {screen.source.dataset_generated_at ?? "Unavailable"} · {readable(screen.source.freshness)} · {screen.source.records_screened.toLocaleString()} records screened</p>{screen.error && <p className="scenario-error">{screen.error}</p>}
        {screen.matches.map(match => <div className="scenario-candidate" key={`${match.source}-${match.id}`}><strong>{match.name}</strong><span>{match.source}</span>{(match.source_information_url || match.source_list_url) && <a href={match.source_information_url ?? match.source_list_url ?? undefined} target="_blank" rel="noreferrer">Agency source <Icon name="arrow" size={12} /></a>}</div>)}
        {screen.total_matches > screen.matches.length && <p>Showing {screen.matches.length} of {screen.total_matches} recorded candidates.</p>}
      </article>)}
    </section>}

    <section className="scenario-section" aria-labelledby="scenario-evidence-title"><div className="scenario-section-heading"><h3 id="scenario-evidence-title">Evidence to resolve</h3><span className="scenario-section-count">Inputs & documents</span></div>
      <div className="scenario-evidence-grid"><div><h4>Missing inputs <span>{result.missing_information.length}</span></h4>{result.missing_information.length ? <ul className="scenario-input-list">{result.missing_information.map(item => <li key={item.field}><strong>{readable(item.field)}</strong><p>{item.reason}</p><small>{item.rule_ids.join(" · ")}</small></li>)}</ul> : <p className="scenario-section-note">No missing inputs recorded.</p>}</div>
        <div><h4>Supporting documents <span>{result.required_documents.length}</span></h4>{result.required_documents.length ? <ul className="scenario-document-list">{result.required_documents.map(document => <li key={document.type}><div><strong>{readable(document.type)}</strong><span className={`scenario-document-status scenario-document-${document.status.toLowerCase()}`}>{document.status === "PROVIDED_UNVERIFIED" ? "Provided · unverified" : document.status === "EXPIRED" ? "Expired" : "Missing"}</span></div>{document.references.map(reference => <p key={reference}>{reference}</p>)}</li>)}</ul> : <p className="scenario-section-note">No document requirements recorded.</p>}</div></div>
    </section>

    <section className="scenario-section" aria-labelledby="scenario-next-title"><div className="scenario-section-heading"><h3 id="scenario-next-title">Next steps</h3><span className="scenario-section-count">Assigned by the evaluator</span></div><div className="scenario-next-grid">{(["agent", "human"] as const).map(owner => {
      const steps = result.remediation_plan.filter(step => step.owner === owner);
      return <div key={owner}><h4><Icon name={owner === "agent" ? "briefcase" : "shield"} size={15} />{owner === "agent" ? "Agent tasks" : "Human review"}<span>{steps.length}</span></h4>{steps.length ? <ol>{steps.map((step, index) => <li key={`${step.requirement_id}-${index}`}><p>{step.instruction}</p>{step.requirement_id && <small>{step.requirement_id}</small>}</li>)}</ol> : <p className="scenario-section-note">No tasks recorded for this owner.</p>}</div>;
    })}</div></section>

    <section className="scenario-section" aria-labelledby="scenario-coverage-title"><div className="scenario-section-heading"><h3 id="scenario-coverage-title">Coverage & sources</h3><span className="scenario-section-count">Partial scenario coverage</span></div>
      <p className="scenario-section-note">Checked packs: {result.coverage.rule_packs.length ? result.coverage.rule_packs.join(" · ") : "No active packs"}. This assessment does not provide complete transaction clearance.</p>
      {result.coverage.unsupported.length > 0 && <div className="scenario-unsupported"><h4>Separate jurisdiction review needed</h4>{result.coverage.unsupported.map((item, index) => <div key={`${item.country}-${item.direction}-${index}`}><strong>{countryName(item.country)} · {directionLabels[item.direction]}</strong><p>{item.reason}</p></div>)}</div>}
      <details className="scenario-limitations"><summary>Assessment limitations</summary><ul>{result.coverage.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul></details>
      <ul className="scenario-source-list">{result.sources.map(source => <li key={`${source.url}-${source.verified_as_of}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="arrow" size={13} /></a><span>{source.verified_as_of ? `Source checked ${source.verified_as_of}` : "Source date not verified"} · {readable(source.verification_status)}</span></li>)}</ul>
    </section>
    <footer className="scenario-detail-footer"><code>{scenario.id}</code><span>Advisory assessment · No transaction executed</span></footer>
  </article>;
}

export function TradeScenarios() {
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [selectedId, setSelectedId] = useState(() => {
    const requested = new URLSearchParams(location.search).get("scenario");
    return catalog.scenarios.find(scenario => scenario.id === requested)?.id ?? catalog.scenarios[0]?.id ?? "";
  });
  const filtered = useMemo(() => {
    const search = query.toLowerCase().trim();
    return catalog.scenarios.filter(scenario => (jurisdiction === "all" || scenario.result.coverage.checked_jurisdictions.includes(jurisdiction))
      && (!search || [scenario.title, scenario.input.product, scenario.input.product_category, scenario.input.from_country,
        scenario.input.to_country, countryName(scenario.input.from_country), countryName(scenario.input.to_country),
        ...scenario.result.findings.map(finding => `${finding.rule_id} ${finding.title} ${finding.code}`)].join(" ").toLowerCase().includes(search)));
  }, [query, jurisdiction]);
  const selected = filtered.find(scenario => scenario.id === selectedId) ?? filtered[0];
  const jurisdictions = [...new Set(catalog.scenarios.flatMap(scenario => scenario.result.coverage.checked_jurisdictions))].filter(value => value !== "GLOBAL").sort();

  function selectScenario(scenario: Scenario) {
    setSelectedId(scenario.id);
    const url = new URL(location.href); url.searchParams.set("scenario", scenario.id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return <main className="scenarios-page" id="main-content">
    <header className="scenarios-header"><div className="scenarios-container"><Logo /><nav aria-label="Main navigation"><a href="/">Overview</a><a href="/demo">Request history<Icon name="arrow" size={14} /></a></nav></div></header>
    <div className="scenarios-container"><div className="scenarios-heading"><div><div className="eyebrow"><span /> IMPORT & EXPORT SCENARIOS</div><h1>Trade checks, made visible.</h1><p>Explore the request, the rules it reached, and what an agent needs to do next.</p></div><div className="scenarios-catalog-stat"><strong>{catalog.scenarios.length}<span>examples</span></strong><span>{catalog.rule_count} hardcoded rules</span></div></div>
      <div className="scenarios-catalog-note"><Icon name="clock" size={16} /><p>Recorded examples · Catalog generated <time dateTime={catalog.generated_at}>{dateLabel(catalog.generated_at)}</time>. Results are precomputed from the MCP evaluator.</p><a href="/demo">View real request history<Icon name="arrow" size={13} /></a></div>
      <div className="scenarios-layout"><aside className="scenario-browser" aria-label="Scenario selector"><div className="scenario-search"><label htmlFor="scenario-search">Find a scenario</label><input id="scenario-search" type="search" placeholder="Product, country, rule…" value={query} onChange={event => setQuery(event.target.value)} /><label htmlFor="scenario-jurisdiction" className="scenario-filter-label">Rule jurisdiction</label><select id="scenario-jurisdiction" value={jurisdiction} onChange={event => setJurisdiction(event.target.value)}><option value="all">All jurisdictions</option>{jurisdictions.map(value => <option key={value} value={value}>{value === "EU" ? "European Union" : countryName(value)}</option>)}</select></div><div className="scenario-list-count" role="status">{filtered.length} of {catalog.scenarios.length} examples</div><div className="scenario-list">{filtered.map(scenario => <button className="scenario-list-item" key={scenario.id} aria-pressed={selected?.id === scenario.id} onClick={() => selectScenario(scenario)}><span className="scenario-list-route">{scenario.input.from_country}<Icon name="arrow" size={13} />{scenario.input.to_country}<span>{readable(scenario.input.product_category ?? "Unclassified")}</span></span><strong>{scenario.title}</strong><span className="scenario-list-bottom"><span className={`scenario-list-dot scenario-list-dot-${scenario.result.decision.toLowerCase()}`} />{decisionLabels[scenario.result.decision]}<small>{scenario.result.findings.length} findings</small></span></button>)}</div>{filtered.length === 0 && <div className="scenario-no-results"><Icon name="globe" size={25} /><h2>No matching examples</h2><p>Try another country, product, or rule.</p><button onClick={() => { setQuery(""); setJurisdiction("all"); }}>Clear filters</button></div>}</aside>
        <div className="scenario-detail-column">{selected ? <ScenarioDetail key={selected.id} scenario={selected} /> : <div className="scenario-empty-detail"><Icon name="route" size={35} /><h2>Find a trade scenario</h2><p>Clear or change the filters to inspect a recorded assessment.</p></div>}</div>
      </div><footer className="scenarios-footer"><Logo /><p>Hardcoded scenarios with source links and explicit coverage gaps.<br />Use the MCP Inspector to run a new assessment.</p><a href="/">Back to overview<Icon name="arrow" size={14} /></a></footer>
    </div>
  </main>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, Logo } from "./ui.tsx";
import { latestRequests, outcomeLabels, policyLabels, type Outcome, type RequestPage, type RequestRecord } from "../lib/requests.ts";
import "../demo.css";

const toolLabels: Record<string, string> = {
  check_import_export: "Import & export assessment",
  get_import_export_requirements: "Import & export requirements",
  get_import_export_remediation_plan: "Import & export remediation plan",
  check_action: "Import & export check", get_requirements: "Import & export requirements", get_remediation_plan: "Import & export remediation plan",
  check_marketing_email: "Marketing review", screen_restricted_party: "Party screening",
};

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <span className={`demo-outcome demo-outcome-${outcome.toLowerCase()}`}><span />{outcomeLabels[outcome]}</span>;
}

function policyName(record: RequestRecord) {
  if (record.policy.kind === "unsupported") return "Outside current coverage";
  return record.policy.id ? policyLabels[record.policy.id] ?? record.policy.id : record.policy.version ? "Routing not recorded" : "Policy not recorded";
}

function timeLabel(time: string) {
  return new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function RequestDetails({ record }: { record: RequestRecord }) {
  return (
    <div className="demo-detail" id={`detail-${record.id}`}>
      <div className="demo-detail-top">
        <section>
          <h3><span>01</span> What was requested</h3>
          {record.facts.length ? <dl className="demo-facts">{record.facts.map((fact) => (
            <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
          ))}</dl> : <p>The gateway did not capture the action inputs for this call.</p>}
          {record.facts.some((fact) => fact.label === "Submitted budget" || fact.label === "Purchase amount") && (
            <p className="demo-fact-note">Amounts use the caller’s units; no currency was supplied.</p>
          )}
        </section>
        <section>
          <h3><span>02</span> Result & next steps</h3>
          <p className="demo-result-summary">{record.summary}</p>
          {record.trade && <div className="demo-screening-results">
            <p>Scenario coverage: {record.trade.checkedJurisdictions.join(", ") || "No country-specific rules"}. Full transaction coverage is not provided.</p>
            {record.trade.unsupported.map((side, index) => <p key={index}><strong>{side.country} {side.direction}:</strong> {side.reason}</p>)}
            {record.trade.missingFields.length > 0 && <p>Missing inputs: {record.trade.missingFields.join(", ")}</p>}
            {record.trade.screening.map((party, index) => <article key={index}><strong>{party.party}</strong><p>{party.status.replaceAll("_", " ")} · {party.totalMatches ?? "Unknown"} candidates</p><p>Bundled CSL: {party.freshness}; generated {party.generatedAt ?? "unknown"}. No live lookup.</p></article>)}
          </div>}
          {record.screening && <div className="demo-screening-results">
            <p>{record.screening.status?.replaceAll("_", " ") ?? "Screening status not captured"}
              {record.screening.totalMatches !== null ? ` · ${record.screening.totalMatches} candidate records` : ""}</p>
            {record.screening.error && <p>{record.screening.error}</p>}
            {record.screening.truncated && <p>Showing the first 20 candidates. Narrow the party details for further review.</p>}
            {record.screening.candidates.map((candidate) => <article key={`${candidate.source}/${candidate.id}`}>
              <strong>{candidate.name}</strong>
              <p>{candidate.source}</p>
              {candidate.matchedName && <p>Matched name or alias: {candidate.matchedName}</p>}
              {candidate.sourceUrl && <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">Original agency listing <Icon name="arrow" size={13} /></a>}
            </article>)}
          </div>}
          <p className="demo-execution"><Icon name="shield" size={15} />{record.execution === "not_performed"
            ? "This assessment did not execute a business action."
            : "The gateway does not report whether the requested business action was completed."}</p>
          {record.nextSteps.length > 0 && <ol className="demo-steps">{record.nextSteps.map((step, index) => (
            <li key={index}><span>{step.owner}</span><p>{step.instruction}</p></li>
          ))}</ol>}
        </section>
      </div>
      <section className="demo-policy-section">
        <h3><span>03</span> Why this policy</h3>
        <div className="demo-policy-description">
          <div>
            <h4>{policyName(record)}</h4>
            <p>{record.policy.reason ?? "This historical response did not record a routing explanation. The original result and any recorded source links appear here."}</p>
          </div>
          {record.policy.version && <span className="demo-version">{record.policy.version}</span>}
        </div>
        {record.policy.kind === "general" && <p className="demo-coverage-note">A general review checklist was selected. Country-specific legal requirements still need review.</p>}
        {record.policy.scope && <details className="demo-scope"><summary>Policy coverage</summary><p>{record.policy.scope}</p></details>}
        {record.trade && <div className="demo-requirements">{record.trade.findings.map((finding) => <article key={finding.id}>
          <div className="demo-requirement-title"><h4>{finding.direction.toUpperCase()} · {finding.title}</h4><span>{finding.conditionStatus === "UNKNOWN" ? "Potential · needs evidence" : "For review"}</span></div>
          <p><strong>{finding.code.replaceAll("_", " ")}.</strong> {finding.detail}</p>
          {finding.sourceUrl && <a href={finding.sourceUrl} target="_blank" rel="noreferrer">Read official source <Icon name="arrow" size={13} /></a>}
        </article>)}</div>}
        {record.requirements.length > 0 && <div className="demo-requirements">{record.requirements.filter((requirement) => !record.trade || !record.trade.findings.some((finding) => finding.id === requirement.id)).map((requirement) => (
          <article key={requirement.id}>
            <div className="demo-requirement-title"><h4>{requirement.title}</h4><span>{requirement.basis === "purchase_constraint"
              ? "Your budget constraint" : requirement.status === "SATISFIED" ? "Satisfied" : requirement.status === "FAILED" ? "Failed"
              : requirement.status === "MISSING" ? "Missing information" : "For review"}</span></div>
            <p>{requirement.detail}</p>
            {requirement.sourceUrl ? <a href={requirement.sourceUrl} target="_blank" rel="noreferrer">Read source guidance <Icon name="arrow" size={13} /></a>
              : <span className="demo-no-source">{requirement.basis === "purchase_constraint" ? "Caller-supplied constraint, not an international policy." : "No legal source recorded for this requirement."}</span>}
          </article>
        ))}</div>}
      </section>
      <div className="demo-record-footer"><span>{toolLabels[record.tool] ?? record.tool} · {timeLabel(record.time)}</span><span>{record.durationMs !== null ? `${Math.round(record.durationMs).toLocaleString()} ms · ` : ""}{record.payloadCaptured ? "Captured gateway response" : "Incomplete payload capture"}</span></div>
    </div>
  );
}

export function Demo() {
  const [data, setData] = useState<RequestPage | null>(null);
  const [category, setCategory] = useState<"trade" | "marketing" | "screening">("trade");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/requests", { signal: controller.signal, cache: "no-store" });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The request history connection is unavailable. Try again shortly.");
      const page = await response.json();
      if (!response.ok) throw new Error(typeof page.error === "string" ? page.error : "Could not load request history.");
      if (!Array.isArray(page.requests)) throw new Error("The history response could not be read.");
      if (controller.signal.aborted) return;
      const incoming = page as RequestPage;
      setData({ ...incoming, requests: latestRequests(incoming.requests) });
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load request history.");
    } finally {
      if (!controller.signal.aborted) { setBusy(false); activeRequest.current = null; }
    }
  }, []);

  useEffect(() => {
    setData(null);
    void load();
    return () => activeRequest.current?.abort();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden && !activeRequest.current) void load();
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const records = data?.requests ?? [];
  const filtered = records.filter((record) => record.category === category);

  return (
    <main className="demo-page" id="main-content">
      <header className="demo-header"><div className="demo-container"><Logo /><a href="/">Back to overview <Icon name="arrow" size={15} /></a></div></header>
      <div className="demo-container">
        <div className="demo-heading">
          <div><div className="eyebrow"><span /> AGENT ACTIVITY</div><h1>Requests</h1><p>Agent requests, results, and the policy behind each check.</p></div>
        </div>

        <section className="demo-activity" aria-label="Requests">
          <div className="demo-toolbar">
            <div className="demo-tabs" role="group" aria-label="Request type">
              {([['trade', 'Import & export'], ['marketing', 'Marketing'], ['screening', 'Restricted parties']] as const).map(([value, label]) => (
                <button key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setOpenId(null); }}>{label}</button>
              ))}
            </div>
          </div>

          {error && <div className="demo-error" role="alert"><strong>{data ? "History could not refresh." : "History could not load."}</strong><p>{error}</p><button onClick={() => void load()} disabled={!!busy}>Try again <Icon name="arrow" size={14} /></button></div>}
          {!data && busy ? <div className="demo-loading" role="status"><div className="demo-loading-line" /><div className="demo-loading-line" /><div className="demo-loading-line" /><p>Reading gateway requests…</p></div>
            : data && <>
              <div className="demo-list-heading" aria-hidden="true"><span>Request / route</span><span>Result</span><span>Policy</span><span /></div>
              <div className="demo-request-list">{filtered.map((record) => (
                <article className={`demo-request ${openId === record.id ? "demo-request-open" : ""}`} key={record.id}>
                  <button className="demo-request-row" aria-expanded={openId === record.id} aria-controls={`detail-${record.id}`} onClick={() => setOpenId(openId === record.id ? null : record.id)}>
                    <span className="demo-request-main"><span className={`demo-type-icon demo-type-${record.category}`}><Icon name={record.category === "screening" ? "shield" : record.category === "marketing" ? "mail" : record.category === "trade" ? "briefcase" : "file"} size={18} /></span><span><strong>{record.title}</strong><span className="demo-request-route">{record.route}</span><span className="demo-request-time">{timeLabel(record.time)} <span>·</span> {toolLabels[record.tool]}</span></span></span>
                    <span><OutcomeBadge outcome={record.outcome} /></span><span className="demo-policy-cell">{policyName(record)}<small>{record.policy.kind === "composed" ? "Combined scenario rules" : record.policy.kind === "list_screening" ? "U.S. list screening" : record.policy.kind === "destination_specific" ? "Destination-specific checklist" : record.policy.kind === "general" ? "General review checklist" : record.policy.kind === "unsupported" ? "Separate review required" : "Historical response"}</small></span><span className="demo-expand" aria-hidden="true">{openId === record.id ? "−" : "+"}</span>
                  </button>
                  {openId === record.id && <RequestDetails record={record} />}
                </article>
              ))}</div>
              {filtered.length === 0 && <div className="demo-empty"><Icon name="route" size={30} /><h3>{category === "screening" ? "No screening requests yet" : category === "marketing" ? "No marketing requests yet" : "No import/export requests yet"}</h3><p>Requests will appear here once their details are captured.</p></div>}
            </>}
        </section>
        <footer className="demo-footnote"><Icon name="shield" size={16} /><p>Advisory results only. A successful check does not mean an action was approved or completed.</p></footer>
      </div>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { Icon, Logo } from "./ui.tsx";
import { outcomeLabels } from "../lib/requests.ts";
import type { MarketingAssessment } from "../lib/marketing.ts";
import "../demo.css";
import "../marketing.css";

interface Example { id: string; title: string; description: string; expected_decision: keyof typeof outcomeLabels; input: Record<string, unknown> }
const statusLabels = { SATISFIED: "Satisfied", FAILED: "Failed", MISSING: "Needs evidence", REVIEW: "Needs review" };

export function MarketingPlayground() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<MarketingAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const currentExample = examples.find((example) => example.id === selected);

  async function loadExamples(signal?: AbortSignal) {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/marketing/examples", { signal, cache: "no-store" });
      const page = await response.json();
      if (!response.ok) throw new Error(page.error ?? "Could not load examples.");
      if (!Array.isArray(page.examples) || !page.examples.length) throw new Error("The example catalog could not be read.");
      if (signal?.aborted) return;
      setExamples(page.examples); setSelected(page.examples[0].id); setDraft(JSON.stringify(page.examples[0].input, null, 2)); setResult(null);
    } catch (caught) {
      if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Could not load examples.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => {
    const initial = new AbortController(); void loadExamples(initial.signal);
    return () => { initial.abort(); controller.current?.abort(); };
  }, []);

  function changeDraft(value: string) {
    controller.current?.abort(); setBusy(false); setDraft(value); setResult(null); setError(null); setCopied(false);
  }
  function selectExample(id: string) {
    const example = examples.find((item) => item.id === id);
    if (!example) return;
    setSelected(id); changeDraft(JSON.stringify(example.input, null, 2));
  }
  async function runCheck() {
    controller.current?.abort(); const active = new AbortController(); controller.current = active;
    setBusy(true); setError(null); setResult(null);
    try {
      JSON.parse(draft);
      const response = await fetch("/api/marketing/check", { method: "POST", signal: active.signal,
        headers: { "Content-Type": "application/json" }, body: draft });
      const assessment = await response.json();
      if (!response.ok) throw new Error(assessment.error ?? "Could not evaluate this request.");
      if (!Array.isArray(assessment.requirements) || typeof assessment.message_sha256 !== "string") throw new Error("The assessment could not be read.");
      if (!active.signal.aborted) setResult(assessment);
    } catch (caught) {
      if (!active.signal.aborted) setError(caught instanceof SyntaxError ? "The request is not valid JSON. Correct it and run the check again."
        : caught instanceof Error ? caught.message : "The request could not be evaluated.");
    } finally { if (!active.signal.aborted) setBusy(false); }
  }

  return <main className="demo-page marketing-page" id="main-content">
    <header className="demo-header"><div className="demo-container"><Logo /><a href="/demo">Request history <Icon name="arrow" size={15} /></a></div></header>
    <div className="demo-container">
      <div className="demo-heading"><div><div className="eyebrow"><span /> MARKETING POLICY ENGINE</div><h1>Check an email.</h1>
        <p>Inspect one rendered email and one recipient against US, Canadian and UK policy checks.</p></div></div>
      <div className="marketing-workspace">
        <section className="marketing-editor" aria-labelledby="marketing-input-title">
          <div className="marketing-panel-heading"><h2 id="marketing-input-title">Email & evidence</h2><button onClick={() => void loadExamples()} disabled={loading || busy}>Reload examples</button></div>
          <label htmlFor="marketing-example">Start with an example</label>
          <select id="marketing-example" value={selected} onChange={(event) => selectExample(event.target.value)} disabled={loading || busy}>
            {loading && <option>Loading examples…</option>}{examples.map((example) => <option key={example.id} value={example.id}>{example.title}</option>)}
          </select>
          {currentExample && <p className="marketing-example-description">{currentExample.description} <span>Original example: {outcomeLabels[currentExample.expected_decision]}.</span></p>}
          <label htmlFor="marketing-request">Request JSON</label>
          <textarea id="marketing-request" spellCheck={false} value={draft} onChange={(event) => changeDraft(event.target.value)} placeholder="Load an example or paste a marketing request." />
          <div className="marketing-actions"><button className="button button-blue" onClick={() => void runCheck()} disabled={loading || busy || !draft}>
            {busy ? "Checking…" : "Run policy check"}<Icon name="arrow" size={15} /></button>
            <button onClick={async () => { try { await navigator.clipboard.writeText(draft); setCopied(true); } catch { setError("Select and copy the request from the editor."); } }} disabled={!draft}>{copied ? "Copied" : "Copy request"}</button></div>
          <p className="marketing-note">Examples contain synthetic records. Supplied evidence is assessed as provided; CRM, consent and email platforms are not connected. No email is sent.</p>
        </section>
        <section className="marketing-results" aria-labelledby="marketing-result-title" aria-busy={busy}>
          <div className="marketing-panel-heading"><h2 id="marketing-result-title">Assessment</h2>{result && <span className={`demo-outcome demo-outcome-${result.decision.toLowerCase()}`}><span />{outcomeLabels[result.decision]}</span>}</div>
          {error && <div className="marketing-error" role="alert">{error}</div>}
          {busy && <p role="status">Evaluating the email and its evidence…</p>}
          {!result && !busy && !error && <div className="marketing-placeholder"><Icon name="mail" size={35} /><h3>See what needs to change.</h3><p>Load an example and run the check. Edit its content or evidence, then run it again.</p></div>}
          {result && <>
            <p className="marketing-summary" role="status">{result.summary}</p>
            <p className="marketing-policy-list">{result.coverage.checked_policies.join(" · ") || "No supported commercial policy evaluated"}</p>
            <details className="marketing-fingerprint"><summary>Exact message fingerprint</summary><code>{result.message_sha256}</code><p>Edited drafts need fresh review evidence using this hash. Updating a hash alone does not perform a review.</p></details>
            {result.proposed_corrections.length > 0 && <section className="marketing-corrections"><h3>Proposed corrections</h3>{result.proposed_corrections.map((correction, index) => <div key={index}><strong>{correction.field}</strong><pre>{correction.value}</pre><p>{correction.reason}</p></div>)}</section>}
            {result.remediation_plan.length > 0 && <section className="marketing-remediation"><h3>Next steps</h3><ol>{result.remediation_plan.map((step) => <li key={step.requirement_id}>{step.instruction}</li>)}</ol></section>}
            <h3 className="marketing-findings-title">Rule findings</h3>
            <div className="marketing-findings">{result.requirements.map((finding) => <article key={finding.id} className={`marketing-finding marketing-finding-${finding.status.toLowerCase()}`}>
              <div><h4>{finding.title}</h4><span>{statusLabels[finding.status]}</span></div><p>{finding.detail}</p><small>{finding.policy_id}</small>
              {finding.evidence_references.length > 0 && <p className="marketing-evidence-reference">Evidence: {finding.evidence_references.join(", ")}</p>}
              {finding.source_url && <a href={finding.source_url} target="_blank" rel="noreferrer">Official source <Icon name="arrow" size={12} /></a>}
            </article>)}</div>
            <details className="marketing-evidence-list"><summary>Evidence freshness and scope</summary>{result.evidence_checks.map((item) => <article key={item.kind}><strong>{item.kind.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}</strong><p>{item.detail}</p>{item.reference && <small>{item.reference} · {item.source}</small>}</article>)}</details>
            <details className="marketing-evidence-list"><summary>Coverage and limitations</summary><ul>{result.coverage.limitations.map((note) => <li key={note}>{note}</li>)}</ul></details>
            <details className="marketing-evidence-list"><summary>Full result JSON</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>
          </>}
        </section>
      </div>
      <footer className="demo-footnote"><Icon name="shield" size={16} /><p>Results cover the implemented checks and supplied evidence. No blockers found is not authorization to send.</p></footer>
    </div>
  </main>;
}

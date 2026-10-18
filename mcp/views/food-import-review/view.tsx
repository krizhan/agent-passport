import { useState, type FormEvent } from "react";
import { ModelContext, useCallTool, useHostContext, useSendFollowUp, useToolContext, type ViewConfig } from "mcp-use/react";
import type { FoodImportEvidence, FoodImportReview } from "../../src/food-review/schemas.js";
import "./view.css";

export const viewConfig = { displayModes: ["inline", "fullscreen"] } satisfies ViewConfig;

const readable = (value: string) => value.replaceAll("_", " ").replaceAll(".", " / ");
const workflowLabels = { WAITING_FOR_EVIDENCE: "Evidence needed", READY_FOR_REVIEW: "Ready for human review", REVIEW_REQUIRED: "Review required" };
const noticeLabels = { UNKNOWN: "Applicability not established", NOT_PROVIDED: "Confirmation not supplied", PROVIDED_UNVERIFIED: "Confirmation supplied · unverified", NOT_APPLICABLE_ASSERTED: "Exemption supplied · unverified" };

function Shield() {
  return <svg width="19" height="21" viewBox="0 0 19 21" fill="none" aria-hidden="true"><path d="M9.5 1.5 17 4.3v5.6c0 4.2-3 7.1-7.5 9.6C5 17 2 14.1 2 9.9V4.3l7.5-2.8Z" stroke="currentColor" strokeWidth="1.6" /><path d="m6 10 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function agentContext(result: FoodImportReview) {
  return {
    type: "food_import_review_submission", workflow_status: result.workflow_status,
    shipment: result.shipment, supplied_evidence: result.evidence,
    assessment: {
      assessed_at: result.assessment.assessed_at, decision: result.assessment.decision,
      summary: result.assessment.summary, policy_version: result.assessment.policy_version,
      missing_information: result.assessment.missing_information,
      required_documents: result.assessment.required_documents,
      coverage: result.assessment.coverage, remediation_plan: result.assessment.remediation_plan,
      screening: result.assessment.screening.map(({ party_name, result: screening }) => ({
        party_name, status: screening.status, total_matches: screening.total_matches,
        snapshot_generated_at: screening.source.dataset_generated_at, freshness: screening.source.freshness,
      })),
    },
    prior_notice_review: result.prior_notice_review,
    advisory_only: true, can_proceed_under_checked_rules: false, execution_performed: false,
  };
}

type FieldName = Exclude<keyof FoodImportEvidence, "plant_material" | "prior_notice_status">;
function Field({ name, label, draft, update, hint, required = false, multiline = false, placeholder, pattern, maxLength = 1000 }: {
  name: FieldName; label: string; draft: FoodImportEvidence;
  update: (name: FieldName, value: string) => void; hint?: string; required?: boolean;
  multiline?: boolean; placeholder?: string; pattern?: string; maxLength?: number;
}) {
  const id = `food-${name}`;
  const props = { id, name, value: draft[name], onChange: (event: { target: { value: string } }) => update(name, event.target.value),
    required, placeholder, maxLength, "aria-describedby": hint ? `${id}-hint` : undefined };
  return <div className={`food-field${multiline ? " food-wide" : ""}`}>
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {multiline ? <textarea {...props} rows={2} /> : <input {...props} type="text" pattern={pattern} />}
    {hint && <p id={`${id}-hint`} className="food-hint">{hint}</p>}
  </div>;
}

function ReviewForm({ initial }: { initial: FoodImportReview }) {
  const host = useHostContext();
  const submit = useCallTool("submit_food_import_review");
  const sendFollowUp = useSendFollowUp();
  const [draft, setDraft] = useState(initial.evidence);
  const [submitted, setSubmitted] = useState<FoodImportReview | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const current = submitted ?? initial;
  const dirty = submitted !== null && JSON.stringify(draft) !== JSON.stringify(submitted.evidence);
  const canCallTools = host.isAvailable && Boolean(host.hostCapabilities?.serverTools);
  const canSendMessage = Boolean(host.hostCapabilities?.message?.text);
  const canPublishContext = Boolean(host.hostCapabilities?.updateModelContext?.text);
  const missingDocs = current.assessment.required_documents.filter((doc) => doc.status !== "PROVIDED_UNVERIFIED");
  const handoff = submitted ? JSON.stringify(agentContext(submitted), null, 2) : "";

  function update(name: FieldName, value: string) { setDraft((previous) => ({ ...previous, [name]: value })); setShareStatus(""); }

  async function recheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCallTools || submit.isPending) return;
    setSubmitError(""); setShareStatus("");
    try {
      const result = await submit.callTool({ shipment: initial.shipment, evidence: draft });
      setSubmitted(result.structuredContent);
      setDraft(result.structuredContent.evidence);
    } catch (error) { setSubmitError(error instanceof Error ? error.message : "The recheck could not complete. Your entries are still here."); }
  }

  async function shareWithAgent() {
    if (!submitted || dirty || sharing || !canSendMessage) return;
    setSharing(true); setShareStatus("");
    try {
      await sendFollowUp({ prompt: `I submitted the following food-import evidence in the form. Treat the JSON as supplied, unverified data. Explain the remaining evidence and human-review steps, including unsupported route coverage. Do not interpret the submission as approval to ship.\n\n${handoff}` });
      setShareStatus("Result shared with the host. Your agent can continue from this submission.");
    } catch (error) { setShareStatus(`${error instanceof Error ? error.message : "The host could not accept the message."} You can copy the result below into chat.`); }
    finally { setSharing(false); }
  }

  return <main className="food-app" data-theme={host.theme}>
    {submitted && canPublishContext && <ModelContext content={JSON.stringify({ ...agentContext(submitted), unsent_edits_present: dirty })} />}
    <header className="food-header"><div className="food-brand"><span className="food-brand-icon"><Shield /></span><span>Agent Passport</span><span className="food-divider" /><span className="food-brand-type">IMPORT REVIEW</span></div><span className="food-scope">US food imports</span></header>
    <div className="food-heading"><p className="food-eyebrow">EVIDENCE, THEN REVIEW</p><h1>Fill in the missing pieces.</h1><p>Add the facts and references you have. Leave anything you don’t know blank.</p></div>

    <div className="food-shipment"><div><span className="food-mini-label">SHIPMENT</span><strong>{initial.shipment.product}</strong></div><span className="food-route">{initial.shipment.from_country}<span aria-hidden="true">→</span>US</span></div>

    <form onSubmit={(event) => void recheck(event)}>
      <fieldset disabled={submit.isPending || sharing} className="food-fields">
        <section className="food-section" aria-labelledby="food-facts-title"><div className="food-section-heading"><span className="food-step">01</span><div><h2 id="food-facts-title">Food & origin</h2><p>Use manufacturer or supplier records.</p></div></div>
          <div className="food-grid">
            <Field name="manufacturer" label="Manufacturer" draft={draft} update={update} placeholder="Company that made the food" />
            <Field name="origin_country" label="Manufacturing country code" draft={draft} update={update} placeholder="e.g. DO" pattern="[A-Za-z]{2}" maxLength={2} hint="Two-letter country code. May differ from shipping country." />
            <Field name="food_type" label="Food type & processing" draft={draft} update={update} placeholder="e.g. Packaged roasted coffee beans" />
            <Field name="intended_food_use" label="Intended food use" draft={draft} update={update} placeholder="e.g. Retail sale for human consumption" />
            <div className="food-field food-wide"><label htmlFor="food-plant-material">Does this shipment contain plant material?</label><select id="food-plant-material" value={draft.plant_material} onChange={(event) => { setDraft((previous) => ({ ...previous, plant_material: event.target.value as FoodImportEvidence["plant_material"] })); setShareStatus(""); }}><option value="unknown">Not established</option><option value="yes">Yes — commodity-specific review needed</option><option value="no">No — according to supplied records</option></select><p className="food-hint">For coffee or other plant products, confirm the commodity and processing details for APHIS review.</p></div>
          </div>
        </section>

        <section className="food-section" aria-labelledby="food-documents-title"><div className="food-section-heading"><span className="food-step">02</span><div><h2 id="food-documents-title">Classification & evidence</h2><p>Paste record IDs or document links. References remain unverified.</p></div></div>
          <div className="food-grid">
            <Field name="hs_code" label="Proposed HS / HTS code" draft={draft} update={update} placeholder="6, 8 or 10 digits" pattern="[0-9]{6}([0-9]{2})?([0-9]{2})?" maxLength={10} />
            <Field name="commercial_invoice_reference" label="Commercial invoice reference" draft={draft} update={update} placeholder="Invoice ID or document link" />
            <Field name="classification_evidence" label="Basis for the proposed classification" draft={draft} update={update} multiline placeholder="Who supplied or reviewed the code, and which record supports it?" />
            <Field name="classification_record_reference" label="Origin & classification record" draft={draft} update={update} placeholder="Manufacturer or reviewer record" />
            <Field name="customs_classification_record_reference" label="Customs classification review" draft={draft} update={update} placeholder="Importer or broker review reference" />
            <Field name="food_applicability_reference" label="Food-import applicability assessment" draft={draft} update={update} multiline placeholder="Importer or broker record addressing the applicable FDA / USDA requirements" hint="A prior-notice confirmation alone does not replace the broader food-import assessment." />
          </div>
          {initial.shipment.documents.length > 0 && <details className="food-existing"><summary>{initial.shipment.documents.length} existing document references retained</summary><ul>{initial.shipment.documents.map((doc, index) => <li key={index}><strong>{readable(doc.type)}</strong>: {doc.reference}{doc.expires_on ? ` · expires ${doc.expires_on}` : ""}</li>)}</ul></details>}
        </section>

        <section className="food-section" aria-labelledby="food-notice-title"><div className="food-section-heading"><span className="food-step">03</span><div><h2 id="food-notice-title">Prior-notice evidence</h2><p>The importer or broker confirms applicability and filing details.</p></div></div>
          <div className="food-grid"><div className="food-field food-wide"><label htmlFor="food-prior-notice">What has been established?</label><select id="food-prior-notice" value={draft.prior_notice_status} onChange={(event) => { setDraft((previous) => ({ ...previous, prior_notice_status: event.target.value as FoodImportEvidence["prior_notice_status"] })); setShareStatus(""); }}><option value="unknown">Applicability has not been established</option><option value="not_provided">Confirmation is not available yet</option><option value="provided">I have a filing confirmation reference</option><option value="not_applicable">A reviewer supplied a non-applicability basis</option></select></div>
            {draft.prior_notice_status === "provided" && <Field name="prior_notice_reference" label="Filing confirmation reference" draft={draft} update={update} required multiline placeholder="Confirmation number and supporting record" />}
            {draft.prior_notice_status === "not_applicable" && <Field name="prior_notice_exemption_basis" label="Non-applicability basis & supporting record" draft={draft} update={update} required multiline placeholder="State the exemption or other basis and who supplied it" />}
          </div>
        </section>
      </fieldset>
      <div className="food-submit"><div><strong>Your entries support a review.</strong><p>Recheck sends them to Agent Passport. Draft edits stay in this form.</p></div><button type="submit" className="food-button food-primary" disabled={!canCallTools || submit.isPending || sharing}>{submit.isPending ? "Rechecking…" : "Recheck evidence"}<span aria-hidden="true">↗</span></button></div>
      {!canCallTools && <p className="food-message" role="status">{host.isAvailable ? "This host cannot call tools from the form. Ask your agent to call submit_food_import_review with the supplied evidence." : "Connecting to the host…"}</p>}
      {submitError && <div className="food-error" role="alert"><strong>Recheck could not complete.</strong><p>{submitError}</p><p>Your entries are preserved. Correct the details or try again.</p></div>}
    </form>

    <section className="food-result" aria-labelledby="food-result-title" aria-live="polite" aria-busy={submit.isPending}>
      <div className="food-result-heading"><div><p className="food-mini-label">{submitted ? "LATEST RECHECK" : "INITIAL ASSESSMENT"}</p><h2 id="food-result-title">{workflowLabels[current.workflow_status]}</h2></div><span className="food-status"><span />{readable(current.assessment.decision)}</span></div>
      {dirty && <p className="food-dirty">You have changed the form. Recheck again before sharing the result.</p>}
      <div className="food-counts"><div><strong>{current.assessment.missing_information.length}</strong><span>missing inputs</span></div><div><strong>{missingDocs.length}</strong><span>missing / expired documents</span></div><div><strong>{current.assessment.coverage.unsupported.length}</strong><span>route sides need review</span></div></div>
      <p className="food-notice-result"><strong>Prior notice:</strong> {noticeLabels[current.prior_notice_review.status]}. {current.prior_notice_review.next_step}</p>
      <details className="food-remaining"><summary>See remaining evidence & review steps</summary>
        {current.assessment.missing_information.length > 0 && <><h3>Missing facts</h3><ul>{current.assessment.missing_information.map((item) => <li key={item.field}>{readable(item.field)}</li>)}</ul></>}
        {missingDocs.length > 0 && <><h3>Supporting documents</h3><ul>{missingDocs.map((doc) => <li key={doc.type}>{readable(doc.type)} · {readable(doc.status)}</li>)}</ul></>}
        {current.assessment.coverage.unsupported.length > 0 && <><h3>Separate jurisdiction review</h3><ul>{current.assessment.coverage.unsupported.map((side, index) => <li key={index}><strong>{side.country} {side.direction}:</strong> {side.reason}</li>)}</ul></>}
        <h3>Next steps</h3><ul>{current.assessment.remediation_plan.map((step, index) => <li key={index}><strong>{step.owner === "agent" ? "Agent" : "Reviewer"}:</strong> {step.instruction}</li>)}</ul>
      </details>
      {submitted && <div className="food-handoff"><div><h3>Continue with your agent</h3><p>{canSendMessage ? "Share the submitted evidence and remaining steps in the conversation." : "This host does not support a follow-up message. Copy the result below into your conversation."}</p></div>
        {canSendMessage && <button type="button" className="food-button food-secondary" disabled={dirty || sharing || submit.isPending} onClick={() => void shareWithAgent()}>{sharing ? "Sharing…" : "Share result with agent"}<span aria-hidden="true">→</span></button>}
        <details className="food-handoff-json"><summary>View result for agent</summary><label className="food-sr-only" htmlFor="food-agent-result">Submitted result JSON — select and copy into chat</label><textarea id="food-agent-result" readOnly value={handoff} rows={8} onFocus={(event) => event.currentTarget.select()} /></details>
        {shareStatus && <p className="food-message" role="status">{shareStatus}</p>}
      </div>}
    </section>
    <footer className="food-footer"><Shield /><p>Supplied evidence · Human review required · No filing or transaction performed</p></footer>
  </main>;
}

export default function FoodImportReviewView() {
  const context = useToolContext<"open_food_import_review">();
  if (context.status === "pending") return <main className="food-app food-pending" role="status"><p className="food-eyebrow">AGENT PASSPORT</p><h1>Preparing your evidence form…</h1><p>Checking the shipment and identifying missing information.</p><div className="food-skeleton" /><div className="food-skeleton" /></main>;
  if (context.status === "error") return <main className="food-app"><div className="food-error" role="alert"><h1>The form could not open.</h1><p>{context.error.message}</p><p>Ask your agent to retry with a food shipment from a non-US country to the United States.</p></div></main>;
  return <ReviewForm initial={context.toolOutput} />;
}

import { MCPServer } from "mcp-use";
import { checkAction, getRequirements } from "./src/policy.js";
import { checkMarketingEmail } from "./src/marketing/evaluate.js";
import { marketingInputSchema, marketingEvaluationSchema } from "./src/marketing/schemas.js";
import { marketingExamples } from "./src/marketing/examples.js";
import { evaluationSchema, requestSchema, requirementsResponseSchema, screeningInputSchema } from "./src/schemas.js";
import { screenRestrictedParty, screeningEvaluationSchema } from "./src/screening/index.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.10.0",
  description: "Advisory international purchase and marketing checks, plus point-in-time U.S. restricted-party screening.",
  instructions: "Use check_import_export, get_import_export_requirements, and get_import_export_remediation_plan for international purchases with product, from_country, and to_country. The tool selects the workflow; do not supply action_type. Use check_marketing_email for one rendered commercial email and recipient with sender, recipient, message, planned_send_at, dispatch_country and supplied evidence. It checks candidate US CAN-SPAM, Canada CASL and UK PECR rules, returns evidence gaps, source links and proposed corrections, and binds content reviews to message_sha256. NO_BLOCKERS_FOUND is limited to implemented checks, not permission to send. Evidence is supplied, not independently authenticated; no CRM, ESP or unsubscribe calls occur. Get copyable requests from marketing://examples. Use screen_restricted_party with name, optional aliases, country, and address. It screens names and aliases against a bundled U.S. CSL JSON snapshot without network access and returns candidate records, snapshot date/age, provenance, and review steps. Report stale snapshots explicitly; they must be refreshed and redeployed to include later list changes. Country never excludes candidates. A possible name match is not a confirmed identity; no candidates is not transaction clearance. Invalid or incomplete bundled data returns UNAVAILABLE. No business actions are authorized or executed.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_import_export", title: "Check import and export",
  description: "Check an international purchase using product, from_country, and to_country. Return its policy pack, review needs, and next steps. No purchase is authorized or executed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_import_export_requirements", title: "Get import and export requirements",
  description: "List purchase readiness requirements and destination-scoped source links. Supply product, from_country, and to_country. This checklist does not clear a transaction.",
  inputSchema: requestSchema, outputSchema: requirementsResponseSchema, annotations,
}, async (input) => {
  const result = getRequirements(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_import_export_remediation_plan", title: "Get import and export remediation plan",
  description: "Return next steps for an international purchase. Uses the same compliance checklist as check_import_export.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "check_marketing_email", title: "Check marketing email",
  description: "Assess one rendered commercial email for one recipient using sender, recipient, message, planned_send_at, dispatch_country and supplied evidence. Combines candidate US CAN-SPAM, Canada CASL and UK PECR packs; cross-border applicability remains explicit. Checks identity, postal/contact details, opt-out, suppression, and supported consent or commercial soft-opt-in conditions. Return BLOCK, NEEDS_EVIDENCE, REVIEW or NO_BLOCKERS_FOUND, source links, exact message_sha256 and proposed corrections. Supplied review/consent records are not independently authenticated; no provider calls or email sending occur. Use marketing://examples for copyable requests. Recheck changed drafts and refresh suppression near sending.",
  inputSchema: marketingInputSchema, outputSchema: marketingEvaluationSchema, annotations,
}, async (input) => {
  const result = checkMarketingEmail(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "screen_restricted_party", title: "Screen restricted party",
  description: "Screen a person or organization against the bundled U.S. Consolidated Screening List JSON snapshot. Supply name and optional aliases, country, and address. Returns possible name matches, agency links, snapshot date/age, freshness, and review steps. No live lookup or network access occurs. Country is context, never a filter. Stale snapshots still support historical matching and are explicitly flagged for refresh/redeployment. Invalid or incomplete data returns UNAVAILABLE. U.S. list coverage only; no candidates is not clearance and a candidate is not a confirmed identity. No business action is executed.",
  inputSchema: screeningInputSchema, outputSchema: screeningEvaluationSchema,
  annotations,
}, async (input, context) => {
  const result = await screenRestrictedParty(input, { signal: context.signal });
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.resource({ name: "marketing_examples", title: "Marketing policy examples", uri: "marketing://examples", mimeType: "application/json",
  description: "Synthetic copyable marketing requests with fresh demonstration evidence. No real consent or platform records." }, async () => ({
  contents: [{ uri: "marketing://examples", mimeType: "application/json", text: JSON.stringify({ generated_at: new Date().toISOString(), examples: marketingExamples() }) }],
}));

export default server;

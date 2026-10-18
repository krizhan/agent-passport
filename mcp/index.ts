import { MCPServer } from "mcp-use";
import { checkAction, checkMarketingEmail, getRequirements } from "./src/policy.js";
import { evaluationSchema, marketingInputSchema, marketingEvaluationSchema, requestSchema, requirementsResponseSchema, screeningInputSchema } from "./src/schemas.js";
import { screenRestrictedParty, screeningEvaluationSchema } from "./src/screening/index.js";
import { checkImportExport } from "./src/trade/evaluate.js";
import { tradeInputSchema, tradeEvaluationSchema } from "./src/trade/schemas.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.10.0",
  description: "Scenario-based import/export assessments, advisory purchase and marketing checks, and bundled U.S. restricted-party screening.",
  instructions: "Use check_import_export for scenario-based shipment, reexport, transit and technology-transfer assessment. Supply product, from_country and to_country, then use missing_information and remediation_plan to gather evidence. Product categories, classifications and technical flags are caller assertions. Report partial coverage, rule/source dates and bundled screening freshness. Optional amount/budget are caller constraints, separate from legal findings. Use get_import_export_requirements and get_import_export_remediation_plan for the original purchase-readiness checklists with optional amount/budget. Public inputs do not accept action_type. Use check_marketing_email for the general permission, sender-identification and unsubscribe checklist, which always requires review. Use screen_restricted_party for a standalone bundled U.S. CSL name search. Screening is offline: report snapshot date/age, stale or unavailable data, and candidates requiring identity review; no candidates is not clearance. No business actions are authorized or executed.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_import_export", title: "Check import and export",
  description: "Assess a shipment, reexport, transit or technology transfer against hardcoded scenario rules. Supply product, from_country and to_country; add product_category, origin_country, classifications/evidence, technical_specifications, end user/use, parties and documents as available. Combines US, EU, GB, CN, IN, CA, AU, JP and KR packs; use actual member-country ISO codes for the EU. Returns separate import/export/transit/screening findings, missing evidence/documents, sources, coverage gaps and remediation. Optional amount/budget retain caller-supplied purchase constraints. Supplied parties are screened against the bundled dated US CSL snapshot without live lookup. Categories and technical flags are caller assertions, not verified classifications. No transaction is cleared or executed.",
  inputSchema: tradeInputSchema, outputSchema: tradeEvaluationSchema, annotations,
}, async (input, context) => {
  const result = await checkImportExport(input, { signal: context.signal });
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
  description: "Return the original purchase-readiness checklist and optional amount/budget comparison. Use check_import_export for expanded scenario rules, party screening and evidence-based remediation.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "check_marketing_email", title: "Check marketing email",
  description: "Return a general marketing-email review checklist for one recipient_country, with optional recipient_count and purpose. Covers recipient permission, sender identification, and unsubscribe/suppression handling. Country-specific rules and evidence need external review; this tool does not inspect email content, verify consent, or send email. Returns REVIEW with requirements and next steps.",
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

export default server;

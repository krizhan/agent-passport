import { MCPServer } from "mcp-use";
import { checkAction, getRequirements } from "./src/policy.js";
import { checkMarketingEmail } from "./src/marketing/evaluate.js";
import { marketingInputSchema, marketingEvaluationSchema } from "./src/marketing/schemas.js";
import { evaluationSchema, requestSchema, requirementsResponseSchema, screeningInputSchema } from "./src/schemas.js";
import { screenRestrictedParty, screeningEvaluationSchema } from "./src/screening/index.js";
import { checkImportExport } from "./src/trade/evaluate.js";
import { tradeInputSchema, tradeEvaluationSchema } from "./src/trade/schemas.js";
import { openFoodImportReview, submitFoodImportReview, reviewSummary } from "./src/food-review/evaluate.js";
import { foodImportReviewSchema, openFoodImportReviewInputSchema, submitFoodImportReviewInputSchema } from "./src/food-review/schemas.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.12.0",
  description: "Live import/export and marketing assessments, advisory purchase checks, and bundled U.S. restricted-party screening.",
  instructions: "Use check_import_export for shipment, reexport, transit and technology-transfer assessment. Supply product, from_country and to_country, then use missing_information and remediation_plan to gather evidence. Product categories, classifications and technical flags are caller assertions. Report partial coverage, rule/source dates and bundled screening freshness. Use get_import_export_requirements and get_import_export_remediation_plan for the original purchase-readiness checklists without budget fields. Public inputs do not accept action_type. Use open_food_import_review to gather evidence for a US-bound food shipment in an MCP App; submit_food_import_review rechecks supplied evidence. Use check_marketing_email for one rendered email and recipient, planned send time and supplied evidence against candidate US CAN-SPAM, Canada CASL and UK PECR rules. Report evidence gaps, source links and proposed corrections; bind content reviews to message_sha256. NO_BLOCKERS_FOUND is limited to implemented checks. Evidence is not independently authenticated and no provider calls occur. Use screen_restricted_party for a standalone bundled U.S. CSL name search. Screening is offline: report snapshot date/age, stale or unavailable data, and candidates requiring identity review; no candidates is not clearance. No business actions are authorized or executed.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

export const foodImportReviewForm = server.tool({
  name: "open_food_import_review", title: "Food import evidence form",
  description: "Open one interactive evidence form for a food shipment imported into the US. Pass known shipment facts in shipment; product and a non-US from_country are required, while to_country defaults to US and product_category to food_agriculture. Prefill only known facts. The user supplies food details, origin/classification evidence, document references and prior-notice evidence, then rechecks. Returns an advisory assessment and a form in MCP Apps hosts. For clients without UI, collect the missing facts conversationally and call submit_food_import_review. Never invent evidence or treat READY_FOR_REVIEW as authorization. No evidence is stored and no filing or business action occurs.",
  inputSchema: openFoodImportReviewInputSchema, outputSchema: foodImportReviewSchema, annotations,
  view: { name: "food-import-review", description: "One form for supplied food-import facts and evidence references, with a recheck and explicit handoff to the calling agent.", prefersBorder: true },
}, async (input, context) => {
  const result = await openFoodImportReview(input, context.signal);
  return { content: [{ type: "text", text: reviewSummary(result) }], structuredContent: result };
});

export const foodImportReviewSubmission = server.tool({
  name: "submit_food_import_review", title: "Recheck food import evidence",
  description: "Recheck a US-bound food shipment with evidence supplied through the form or conversation. Pass the original shipment and evidence fields from open_food_import_review. Empty fields remain unknown; references and non-applicability statements are unverified. Preserve unresolved party, ownership, export-side and other coverage gaps. Returns structured evidence and updated findings; no case is saved, no filing is submitted, and no transaction is approved or executed.",
  inputSchema: submitFoodImportReviewInputSchema, outputSchema: foodImportReviewSchema, annotations,
}, async (input, context) => {
  const result = await submitFoodImportReview(input, context.signal);
  return { content: [{ type: "text", text: reviewSummary(result) }], structuredContent: result };
});

server.tool({
  name: "check_import_export", title: "Check import and export",
  description: "Assess a shipment, reexport, transit or technology transfer against versioned trade rules. Supply product, from_country and to_country; add product_category, origin_country and end user/use when known. A named end user is automatically screened when no party array is supplied. Basic general-goods checks treat customs and classification paperwork as advisory follow-up; positive-risk rules such as a BIS specific notice or blocked ownership activate only when reported. Higher-risk categories and triggered controls still require detailed classifications, evidence, technical specifications and documents. Combines US, EU, GB, CN, IN, SG, CA, AU, JP and KR packs; use actual member-country ISO codes for the EU. Returns BLOCK, NEEDS_EVIDENCE, REVIEW or NO_BLOCKERS_FOUND plus findings, sources, coverage gaps and remediation. NO_BLOCKERS_FOUND is limited to implemented checks, recent no-candidate screening, no required evidence gap, no substantive review finding and no unsupported route side; it is not legal clearance. Caller assertions are not independently verified. No transaction is cleared or executed.",
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
  description: "Return the original purchase-readiness checklist and next steps. Use check_import_export for expanded scenario rules, party screening and evidence-based remediation.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "check_marketing_email", title: "Check marketing email",
  description: "Assess one rendered commercial email for one recipient using sender, recipient, message, planned_send_at, dispatch_country and supplied evidence. Combines candidate US CAN-SPAM, Canada CASL and UK PECR packs; cross-border applicability remains explicit. Checks identity, postal/contact details, opt-out, suppression, and supported consent or commercial soft-opt-in conditions. Return BLOCK, NEEDS_EVIDENCE, REVIEW or NO_BLOCKERS_FOUND, source links, exact message_sha256 and proposed corrections. Supplied review/consent records are not independently authenticated; no provider calls or email sending occur. Recheck changed drafts and refresh suppression near sending.",
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

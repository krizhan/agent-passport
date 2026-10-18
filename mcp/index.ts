import { MCPServer } from "mcp-use";
import { checkAction, checkMarketingEmail, getRequirements } from "./src/policy.js";
import { evaluationSchema, marketingInputSchema, marketingEvaluationSchema, requestSchema, requirementsResponseSchema, screeningInputSchema } from "./src/schemas.js";
import { screenRestrictedParty, screeningEvaluationSchema } from "./src/screening/index.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.7.0",
  description: "Advisory international purchase and marketing checks, plus point-in-time U.S. restricted-party screening.",
  instructions: "Use get_requirements, check_action, and get_remediation_plan for purchases with product, from_country, and to_country; action_type defaults to purchase. Optional amount and budget must use the same currency and units. Use check_marketing_email with recipient_country and optional recipient_count and purpose for a general review checklist covering permission, sender identification, and unsubscribe handling. Marketing always requires review and does not inspect consent records or email content. Use screen_restricted_party with name, optional aliases, country, and address. It downloads the official U.S. CSL, screens names and aliases, and returns candidate records, source provenance, and review steps. Country never excludes candidates. A possible name match is not a confirmed identity; no candidates is not transaction clearance. Data failures return UNAVAILABLE and require retry. No business actions are authorized or executed.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_action", title: "Check action",
  description: "Check an international purchase using product, from_country, and to_country. Return its policy pack, review needs, and optional purchase budget comparison. No purchase is authorized or executed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_requirements", title: "Get action requirements",
  description: "List purchase readiness requirements and destination-scoped source links. Supply product, from_country, and to_country. This checklist does not clear a transaction.",
  inputSchema: requestSchema, outputSchema: requirementsResponseSchema, annotations,
}, async (input) => {
  const result = getRequirements(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_remediation_plan", title: "Get remediation plan",
  description: "Return next steps for an international purchase. Uses the same checklist and optional purchase budget comparison as check_action.",
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
  description: "Screen a person or organization against the official U.S. Consolidated Screening List. Supply name and optional aliases, country, and address. Returns possible name matches, source links, snapshot timestamps, and review steps. Country is context, never a filter. Downloads public data without sending the submitted names upstream. U.S. list coverage only; no-match is not clearance and a candidate is not a confirmed identity. Failed, stale, or incomplete downloads return UNAVAILABLE. No business action is executed.",
  inputSchema: screeningInputSchema, outputSchema: screeningEvaluationSchema,
  annotations: { ...annotations, openWorldHint: true },
}, async (input, context) => {
  const result = await screenRestrictedParty(input, { signal: context.signal });
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

export default server;

import { MCPServer } from "mcp-use";
import { checkAction, getRequirements } from "./src/policy.js";
import { evaluationSchema, requestSchema, requirementsResponseSchema } from "./src/schemas.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.5.0",
  description: "Advisory policy routing, requirements, and remediation for international purchases and marketing emails.",
  instructions: "Choose action_type=purchase with product, from_country, and to_country, or action_type=marketing_email with recipient_country and optional recipient_count and purpose. Omitting action_type defaults to purchase for existing clients. Purchase inputs may include amount and budget in the same currency and units. Use get_requirements for the selected checklist, check_action for an assessment, and get_remediation_plan for next steps. Marketing uses a general review checklist; country-specific legal requirements still need review. Customs does not authorize or execute purchases or send email.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_action", title: "Check action",
  description: "Choose action_type=purchase (product, from_country, to_country) or marketing_email (recipient_country). Get the selected policy pack, review needs, and optional purchase budget comparison. No action is authorized or executed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_requirements", title: "Get action requirements",
  description: "List requirements for action_type=purchase or marketing_email. Purchase source links are scoped to the destination; marketing uses a general review checklist. Country-specific legal requirements still need review.",
  inputSchema: requestSchema, outputSchema: requirementsResponseSchema, annotations,
}, async (input) => {
  const result = getRequirements(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_remediation_plan", title: "Get remediation plan",
  description: "Return next steps for action_type=purchase or marketing_email. Uses the same router, checklist, and optional purchase budget comparison as check_action.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

export default server;

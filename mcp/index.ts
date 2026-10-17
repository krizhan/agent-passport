import { MCPServer } from "mcp-use";
import { checkPurchase, getRequirements } from "./src/policy.js";
import { evaluationSchema, requestSchema, requirementsResponseSchema } from "./src/schemas.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.5.0",
  description: "Advisory requirements, readiness checks, and remediation for international purchases between any two countries.",
  instructions: "Each tool takes product, from_country, and to_country. Optionally supply amount and budget in the same currency and units for a spending check. Use get_requirements for the checklist, check_action for review needs and budget checks, and get_remediation_plan for next steps. Origin and classification require external review. Customs does not execute or authorize purchases.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_action", title: "Check purchase",
  description: "Get review needs for your product and shipping route, with an optional amount-versus-budget check. No purchase is authorized or executed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkPurchase(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_requirements", title: "Get purchase requirements",
  description: "List general purchase-readiness requirements for any international route. Source links are scoped to the destination; country- and product-specific legal requirements still need review.",
  inputSchema: requestSchema, outputSchema: requirementsResponseSchema, annotations,
}, async (input) => {
  const result = getRequirements(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_remediation_plan", title: "Get remediation plan",
  description: "Return next steps for your product and shipping route. Uses the same checklist and optional budget comparison as check_action.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkPurchase(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

export default server;

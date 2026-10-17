import { MCPServer } from "mcp-use";
import { checkPurchase, getRequirements } from "./src/policy.js";
import { evaluationSchema, requestSchema, requirementsResponseSchema } from "./src/schemas.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.4.0",
  description: "Advisory requirements, readiness checks, and remediation for international purchases between any two countries.",
  instructions: "Supply your own action context to all tools. Use get_requirements to discover the modeled requirements, check_action to assess the purchase, and get_remediation_plan for next steps. Document references are caller-supplied and require review; no document verifier is connected. Customs does not execute actions or authorize other tools.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_action", title: "Check purchase",
  description: "Check your purchase information, origin/classification document references, and optional budget. Supplied document references require review. No action is executed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkPurchase(input);
  return { content: [{ type: "text", text: `${result.decision}: ${result.summary}` }], structuredContent: result };
});

server.tool({
  name: "get_requirements", title: "Get purchase requirements",
  description: "List general purchase-readiness requirements for any international route. Source links are scoped to the destination; country- and product-specific legal requirements still need review.",
  inputSchema: requestSchema, outputSchema: requirementsResponseSchema, annotations,
}, async (input) => {
  const result = getRequirements(input);
  return { content: [{ type: "text", text: `${result.requirements.length} requirements. ${result.supported ? "International purchase readiness checks apply." : "A separate policy is required for this action."}` }], structuredContent: result };
});

server.tool({
  name: "get_remediation_plan", title: "Get remediation plan",
  description: "Check the current purchase context and return next steps for the agent or a human reviewer. Uses the same policy as check_action.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkPurchase(input);
  return { content: [{ type: "text", text: result.remediation_plan.map((step) => `[${step.owner}] ${step.instruction}`).join("\n") || result.summary }], structuredContent: result };
});

export default server;

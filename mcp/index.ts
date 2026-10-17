import { MCPServer } from "mcp-use";
import { checkAction, getRequirements } from "./src/policy.js";
import { evaluationSchema, requestSchema, requirementsResponseSchema } from "./src/schemas.js";

const server = new MCPServer({
  name: "agent-passport", title: "Customs · Agent Passport", version: "0.6.0",
  description: "Advisory policy routing, requirements, and remediation for international purchases and marketing emails.",
  instructions: "Use purchase with product, from_country, to_country, and a product_category established from specifications. Add category-specific product_facts, shipment context, and referenced evidence. Implemented checks cover Singapore chewing gum, Indian electronic cigarettes, and FDA prior notice for commercial packaged roasted coffee arriving by air/sea. Unknown categories, exception claims, and uncovered contexts remain unresolved. Evidence is caller-supplied and is not authenticated. CHECKS_PASSED applies only to the modeled checks and is not import clearance. Use get_requirements to discover inputs, check_action to evaluate, and get_remediation_plan for the same findings and next steps. Marketing remains a review checklist. Budget is unsupported. No purchases, filings, or emails are executed.",
});
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.tool({
  name: "check_action", title: "Check action",
  description: "Evaluate declared product/shipment facts against the selected import rules. Return sourced findings, coverage gaps, and proposed actions. CHECKS_PASSED is scoped and conditional on supplied facts; no action is authorized or executed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_requirements", title: "Get action requirements",
  description: "Discover the selected destination pack's requirements, required fields and official sources. Country/product coverage is limited; marketing is a general review checklist.",
  inputSchema: requestSchema, outputSchema: requirementsResponseSchema, annotations,
}, async (input) => {
  const result = getRequirements(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

server.tool({
  name: "get_remediation_plan", title: "Get remediation plan",
  description: "Return the same assessment as check_action with typed next steps: stop a prohibited action, collect missing facts/evidence, request review, or recheck actual updated inputs. No external action is performed.",
  inputSchema: requestSchema, outputSchema: evaluationSchema, annotations,
}, async (input) => {
  const result = checkAction(input);
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
});

export default server;

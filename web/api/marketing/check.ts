import type { IncomingMessage, ServerResponse } from "node:http";
import { handleMarketing } from "../../server/marketing-handler.js";

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return handleMarketing(request, response, process.env.MARKETING_MCP_URL);
}

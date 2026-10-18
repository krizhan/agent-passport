import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequests } from "../server/requests-handler.js";

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return handleRequests(request, response, {
    apiKey: process.env.MANUFACT_API_KEY,
    serverId: process.env.MANUFACT_SERVER_ID,
  });
}

import type { Requirement } from "../../schemas.js";
import { sources } from "./sources.js";

export const requirements = [
  {
    id: "recipient_permission",
    title: "Recipient permission review",
    basis: "assessment_input",
    source_url: sources.recipientPermission,
    description: "Have a reviewer identify the applicable recipient-permission rules for the recipient country and confirm the campaign has matching permission evidence or another applicable basis before sending.",
  },
  {
    id: "sender_identification",
    title: "Sender identification review",
    basis: "assessment_input",
    source_url: sources.senderIdentification,
    description: "Have a reviewer identify the applicable sender-identification and disclosure requirements for the recipient country and inspect the proposed email content.",
  },
  {
    id: "opt_out_handling",
    title: "Unsubscribe and suppression review",
    basis: "assessment_input",
    source_url: sources.optOutHandling,
    description: "Have a reviewer confirm that unsubscribe and suppression handling meets the applicable requirements for the recipient country before sending the campaign.",
  },
] as const satisfies readonly Requirement[];

import type { PolicyPack } from "../policies/types.js";
import type { Action, Routing } from "../schemas.js";
import { policyRegistry } from "./registry.js";

export interface PolicyRoute {
  policy: PolicyPack | null;
  routing: Routing;
}

// Tool handlers validate and normalize country codes before selecting a pack.
export function routeAction(action: Action): PolicyRoute {
  if (action.action_type === "marketing_email") {
    const policy = policyRegistry["general-marketing"];
    return {
      policy,
      routing: {
        policy_id: policy.id,
        kind: "general",
        reason: `Marketing email to recipients in ${action.recipient_country}; the general marketing review checklist applies.`,
      },
    };
  }

  if (action.from_country === action.to_country) return {
    policy: null,
    routing: {
      policy_id: null,
      kind: "unsupported",
      reason: "Shipping and destination countries are the same; a domestic purchase checklist is required.",
    },
  };

  if (action.to_country === "US") {
    const policy = policyRegistry["us-import"];
    return {
      policy,
      routing: {
        policy_id: policy.id,
        kind: "destination_specific",
        reason: "International purchase with destination US.",
      },
    };
  }

  const policy = policyRegistry["general-purchase"];
  return {
    policy,
    routing: {
      policy_id: policy.id,
      kind: "general",
      reason: `No destination-specific purchase pack is registered for ${action.to_country}; the general international purchase checklist applies.`,
    },
  };
}

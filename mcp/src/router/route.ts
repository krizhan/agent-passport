import type { PolicyPack } from "../policies/types.js";
import type { Purchase, Routing } from "../schemas.js";
import { policyRegistry } from "./registry.js";

export interface PolicyRoute {
  policy: PolicyPack | null;
  routing: Routing;
}

// Tool handlers validate and normalize country codes before selecting a pack.
export function routePurchase(purchase: Pick<Purchase, "from_country" | "to_country">): PolicyRoute {
  if (purchase.from_country === purchase.to_country) return {
    policy: null,
    routing: {
      policy_id: null,
      kind: "unsupported",
      reason: "Shipping and destination countries are the same; a domestic purchase checklist is required.",
    },
  };

  if (purchase.to_country === "US") {
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
      reason: `No destination-specific pack is registered for ${purchase.to_country}; the general international purchase checklist applies.`,
    },
  };
}

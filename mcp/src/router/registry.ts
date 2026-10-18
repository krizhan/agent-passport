import { restrictedPartyPolicy } from "../policies/us-restricted-party/pack.js";
import { generalPurchasePolicy } from "../policies/general-purchase/pack.js";
import { generalMarketingPolicy } from "../policies/general-marketing/pack.js";
import type { PolicyPack } from "../policies/types.js";
import { usImportPolicy } from "../policies/us-import/pack.js";

export const policyRegistry = {
  "us-import": usImportPolicy,
  "general-purchase": generalPurchasePolicy,
  "general-marketing": generalMarketingPolicy,
  "us-restricted-party": restrictedPartyPolicy,
} as const satisfies Readonly<Record<string, PolicyPack>>;

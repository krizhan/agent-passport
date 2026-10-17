import { generalPurchasePolicy } from "../policies/general-purchase/pack.js";
import type { PolicyPack } from "../policies/types.js";
import { usImportPolicy } from "../policies/us-import/pack.js";

export const policyRegistry = {
  "us-import": usImportPolicy,
  "general-purchase": generalPurchasePolicy,
} as const satisfies Readonly<Record<string, PolicyPack>>;

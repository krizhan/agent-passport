import { generalMarketingPolicy } from "../policies/general-marketing/pack.js";
import { generalPurchasePolicy } from "../policies/general-purchase/pack.js";
import type { PolicyPack } from "../policies/types.js";
import { usImportPolicy } from "../policies/us-import/pack.js";
import { singaporeImportPolicy } from "../policies/sg-import/pack.js";
import { indiaImportPolicy } from "../policies/in-import/pack.js";

export const policyRegistry = {
  "sg-import": singaporeImportPolicy,
  "in-import": indiaImportPolicy,
  "us-import": usImportPolicy,
  "general-purchase": generalPurchasePolicy,
  "general-marketing": generalMarketingPolicy,
} as const satisfies Readonly<Record<string, PolicyPack>>;

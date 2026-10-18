import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";

export const generalPurchasePolicy = {
  id: "general-purchase",
  version: "0.6.0",
  scope: "Advisory general international purchase checklist based on the product and shipping countries. This fallback provides general readiness tasks, not a country-specific policy implementation. Country- and product-specific legal requirements, manufacturing origin, classifications, documents, duties, sanctions, and admissibility require external review. No purchase is authorized or executed.",
  requirements,
} as const satisfies PolicyPack;

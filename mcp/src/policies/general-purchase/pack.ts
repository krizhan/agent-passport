import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";

export const generalPurchasePolicy = {
  id: "general-purchase",
  version: "0.6.0",
  scope: "Advisory general international purchase review checklist. This fallback contains no implemented country/product-specific regulatory rules. Origin, classification, documents, duties, sanctions, admissibility, and import/export requirements require review. No purchase is authorized or executed.",
  requirements,
} as const satisfies PolicyPack;

import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";

export const usImportPolicy = {
  id: "us-import",
  version: "0.6.0",
  scope: "Advisory US-bound international purchase checklist based on the product and shipping countries. Sources cover US origin information and tariff-classification guidance. Country- and product-specific legal requirements, manufacturing origin, classifications, documents, duties, sanctions, and admissibility require external review. No purchase is authorized or executed.",
  requirements,
} as const satisfies PolicyPack;

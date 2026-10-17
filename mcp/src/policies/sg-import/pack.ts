import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";
import { rules } from "./rules.js";
export const singaporeImportPolicy = {
  id: "sg-import", version: "0.6.0",
  scope: "Advisory Singapore chewing-gum import restriction check using declared product facts. Approved exclusions require review. No import is authorized or executed.",
  requirements, rules,
  unassessed_topics: ["Other Singapore product restrictions, permits and import conditions", "Export and origin-specific controls", "Sanctions and restricted-party screening", "Tariff classification, valuation and duties", "Product classification and evidence authenticity"],
} as const satisfies PolicyPack;

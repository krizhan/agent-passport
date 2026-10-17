import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";
import { rules } from "./rules.js";
export const usImportPolicy = {
  id: "us-import", version: "0.6.0",
  scope: "Advisory FDA prior-notice applicability, supplied-confirmation-reference and filing-window checks for declared packaged roasted coffee for commercial sale arriving in the US by air or sea. CHECKS_PASSED is conditional on supplied facts, not FDA approval or complete import clearance.",
  requirements, rules,
  unassessed_topics: ["Other foods, shipment purposes, transport modes and exemption claims", "Complete prior-notice filing contents and FDA admissibility", "Product classification and evidence authenticity", "Origin documentation and origin-specific restrictions", "Tariff classification, valuation and duties", "Other agency requirements, permits and export controls", "Sanctions and restricted-party screening"],
} as const satisfies PolicyPack;

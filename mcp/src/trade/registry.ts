import { commonRules } from "./rules/common.js";
import { usImportRules } from "./rules/us-import.js";
import { usExportRules } from "./rules/us-export.js";
import { euRules } from "./rules/eu.js";
import { ukRules } from "./rules/uk.js";
import { chinaRules } from "./rules/china.js";
import { indiaRules } from "./rules/india.js";
import { singaporeRules } from "./rules/singapore.js";
import { usPriorNoticeRules } from "./rules/us-prior-notice.js";
import { canadaAustraliaRules } from "./rules/canada-australia.js";
import { japanKoreaRules } from "./rules/japan-korea.js";
import type { TradeRule } from "./types.js";

// Membership reviewed against european-union.europa.eu/principles-countries-history/eu-countries_en, 2026-10-17.
export const EU_COUNTRIES: ReadonlySet<string> = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);
export const jurisdictionFor = (country: string) => EU_COUNTRIES.has(country) ? "EU" : country;

export const tradeRules: readonly TradeRule[] = [
  ...commonRules, ...usImportRules, ...usExportRules, ...euRules, ...ukRules, ...chinaRules,
  ...indiaRules, ...singaporeRules, ...usPriorNoticeRules, ...canadaAustraliaRules, ...japanKoreaRules,
];

export const TRADE_POLICY_VERSION = "hardcoded-trade/1.2.0";

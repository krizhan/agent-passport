import { usExamples } from "./us.js";
import { euUkExamples } from "./eu-uk.js";
import { otherExamples } from "./other.js";
import { regulatoryExamples } from "./regulatory.js";
import type { z } from "zod";
import type { tradeInputSchema } from "../schemas.js";

export interface TradeExample {
  id: string;
  title: string;
  input: z.input<typeof tradeInputSchema>;
}
const evidenceDocuments = [
  { type: "classification_record", reference: "DEMO manufacturer record; unverified" },
  { type: "end_user_statement", reference: "DEMO civilian end-user statement; unverified" },
];
const evidenceInput: z.input<typeof tradeInputSchema> = {
  product: "DEMO commercial cooling fans", from_country: "US", to_country: "GB", origin_country: "US",
  product_category: "general_goods", hs_code: "841459", control_classification: "EAR99",
  classification_evidence: "DEMO manufacturer assessment; qualified review still required",
  technical_specifications: { subject_to_ear: true, bis_specific_notice_requires_license: false },
  end_user: "Example Components 9F21 Ltd", end_use: "Civilian equipment maintenance", end_use_flags: [],
  ownership: { blocked_ownership_percent: 0, evidence: "DEMO ownership record; unverified" },
  parties: [{ name: "Example Components 9F21 Ltd", role: "end_user", country: "GB" }],
  documents: evidenceDocuments,
};
const commonExamples: readonly TradeExample[] = [
  { id: "common-physical", title: "Cooling fans: origin and customs evidence", input: { product: "Cooling fans", from_country: "VN", to_country: "US", product_category: "general_goods" }, },
  { id: "common-technology", title: "Software access: technical classification needed", input: { product: "Encryption software access", from_country: "US", to_country: "GB", transaction_type: "technology_transfer", product_category: "encryption" }, },
  { id: "common-reexport", title: "U.S.-origin equipment reexported from Britain", input: { product: "U.S.-origin laboratory instrument", from_country: "GB", to_country: "JP", origin_country: "US", transaction_type: "reexport", product_category: "dual_use" }, },
  { id: "common-ownership", title: "Declared aggregate blocked ownership needs review", input: { product: "Commercial spare parts", from_country: "US", to_country: "CA", product_category: "general_goods", ownership: { blocked_ownership_percent: 50, evidence: "Synthetic ownership record; reviewer verification required" } }, },
  { id: "common-unknown-category", title: "Unclassified goods on an unsupported route", input: { product: "Unspecified equipment", from_country: "MX", to_country: "ZA" }, },
  { id: "common-transit", title: "Transit through Singapore needs a local review", input: { product: "Industrial equipment", from_country: "US", to_country: "AU", transit_countries: ["SG"], product_category: "dual_use" }, },
  { id: "evidence-collected-review", title: "Evidence collected: ordinary goods still need review", input: evidenceInput,
    },
  { id: "expired-document", title: "Expired classification evidence needs replacement", input: { ...evidenceInput,
    documents: evidenceDocuments.map((doc) => doc.type === "classification_record" ? { ...doc, expires_on: "2025-01-01" } : doc) },
    },
  { id: "bundled-party-candidate", title: "Bank-name candidate needs identity and sanctions review", input: { ...evidenceInput,
    product: "DEMO goods with an intermediary screening query", parties: [{ name: "VTB BANK PUBLIC JOINT STOCK COMPANY", role: "intermediary", country: "RU" }] },
    },
  { id: "supplied-license-review", title: "Supplied license remains unverified", input: { ...evidenceInput,
    technical_specifications: { subject_to_ear: true, bis_specific_notice_requires_license: true, bis_notice_reference: "DEMO transaction-specific notice; unverified" },
    documents: [...evidenceDocuments, { type: "bis_specific_notice", reference: "DEMO notice; unverified" }, { type: "export_license", reference: "DEMO authorization; issuer and scope unverified" }] },
    },
];
export const tradeExamples: readonly TradeExample[] = [...usExamples, ...euUkExamples, ...otherExamples, ...commonExamples, ...regulatoryExamples];

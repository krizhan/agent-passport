import type { z } from "zod";
import type { tradeInputSchema } from "../schemas.js";

type Input = z.input<typeof tradeInputSchema>;
type Example = {
  id: string;
  title: string;
  input: Input;
  // Required finding IDs, including UNKNOWN findings when information is missing.
};

const euBase: Input = {
  product: "Industrial measurement module for a civilian factory",
  from_country: "DE", to_country: "SG", origin_country: "DE", planned_date: "2026-10-17",
  product_category: "dual_use", hs_code: "903180",
  control_classification: "Assessed as not listed under EU Annex I or IV",
  classification_evidence: "Demo manufacturer classification assessment: module specifications reviewed; status requires human validation.",
  end_user: "Example Civilian Factory", end_use: "Quality measurements on a civilian production line", end_use_flags: [],
  technical_specifications: { eu_annex_i_listed: false, eu_annex_iv_listed: false },
};
const ukBase: Input = {
  ...euBase, from_country: "GB", to_country: "CA", origin_country: "GB",
  control_classification: "Assessed as not listed under UK strategic control lists",
  technical_specifications: {
    uk_export_region: "great_britain", uk_strategic_listed: false, uk_controlled_technology: false,
    ecju_end_use_notification: false, ogel_candidate: false,
  },
};

export const euUkExamples: readonly Example[] = [
  {
    id: "eu-classification-missing", title: "EU category supplied without a control classification",
    input: { ...euBase, control_classification: undefined, classification_evidence: undefined },

  },
  {
    id: "eu-annex-i-physical-export", title: "Caller-confirmed Annex I export outside the EU",
    input: {
      ...euBase, control_classification: "EU Annex I 2B006 (caller assertion)",
      technical_specifications: { eu_annex_i_listed: true, eu_annex_iv_listed: false },
    },
  },
  {
    id: "eu-annex-i-technology", title: "Annex I technology made available outside the EU",
    input: {
      ...euBase, product: "Restricted process documentation for a controlled module", transaction_type: "technology_transfer",
      control_classification: "EU Annex I technology entry (caller assertion)",
      technical_specifications: { eu_annex_i_listed: true, eu_annex_iv_listed: false },
    },
  },
  {
    id: "eu-annex-iv-intra-union", title: "Annex IV item transferred between Member States",
    input: {
      ...euBase, to_country: "FR", control_classification: "EU Annex IV entry (caller assertion)",
      technical_specifications: { eu_annex_i_listed: true, eu_annex_iv_listed: true },
    },
  },
  {
    id: "eu-end-use-review", title: "Non-listed item with WMD concerns",
    input: { ...euBase, product_category: "general_goods", end_use_flags: ["wmd"], end_use: "Buyer inquiry suggests WMD-related use; clarification required" },

  },
  {
    id: "eu001-candidate", title: "EU001 destination with a caller-confirmed controlled item",
    input: {
      ...euBase, to_country: "US", control_classification: "EU Annex I 2B006 (caller assertion)",
      technical_specifications: { eu_annex_i_listed: true, eu_annex_iv_listed: false },
      documents: [{ type: "eu_export_authorization", reference: "Demo EU001 eligibility claim; not verified", expires_on: "2027-01-31" }],
    },
  },
  {
    id: "eu-food-review", title: "Food import with commodity-specific requirements unresolved",
    input: {
      ...euBase, product: "Packaged roasted coffee", from_country: "BR", to_country: "NL", origin_country: "BR",
      product_category: "food_agriculture", hs_code: "090121",
      technical_specifications: { food_type: "roasted coffee", eu_official_certificate_required: false },
    },
  },
  {
    id: "eu-food-official-certificate", title: "Food import with confirmed official certification requirements",
    input: {
      ...euBase, product: "Chilled dairy product", from_country: "NZ", to_country: "FR", origin_country: "NZ",
      product_category: "food_agriculture", hs_code: "040690",
      technical_specifications: { food_type: "dairy product", eu_official_certificate_required: true },
    },
  },
  {
    id: "eu-wildlife-review", title: "Wildlife specimen requires listing and permit review",
    input: {
      ...euBase, product: "Captive-propagated orchid specimen", from_country: "TH", to_country: "DE", origin_country: "TH",
      product_category: "wildlife", technical_specifications: { scientific_name: "Paphiopedilum rothschildianum", specimen_source: "artificial propagation claimed; verify" },
    },
  },
  {
    id: "eu-waste-movement-review", title: "Waste classification and procedure review for an intra-EU shipment",
    input: {
      ...euBase, product: "Scrap electrical assemblies for recovery", to_country: "BE", product_category: "waste",
      technical_specifications: { waste_code: "Y49 (caller assertion)", hazardous: false, recovery_or_disposal: "recovery" },
    },
  },
  {
    id: "eu-sanctions-diversion", title: "EU export with an indirect-route diversion concern",
    input: { ...euBase, end_use_flags: ["diversion"], end_use: "Buyer requests resale; ultimate recipient is unresolved" },

  },
  {
    id: "gb-classification-missing", title: "UK strategic category without supporting classification",
    input: { ...ukBase, control_classification: undefined, classification_evidence: undefined },

  },
  {
    id: "gb-controlled-physical-export", title: "Caller-confirmed strategic item exported from Great Britain",
    input: {
      ...ukBase, control_classification: "UK strategic list 2B006 (caller assertion)",
      technical_specifications: { ...ukBase.technical_specifications, uk_strategic_listed: true },
    },
  },
  {
    id: "gb-controlled-cloud-access", title: "Controlled technology remotely accessed overseas",
    input: {
      ...ukBase, product: "Controlled production drawings shared with an overseas engineering team", transaction_type: "technology_transfer",
      control_classification: "UK controlled technology entry (caller assertion)",
      technical_specifications: { ...ukBase.technical_specifications, uk_controlled_technology: true },
    },
  },
  {
    id: "gb-military-catch-all-review", title: "Unlisted commercial item with military end-use concerns",
    input: { ...ukBase, product_category: "general_goods", end_use_flags: ["military"] },

  },
  {
    id: "gb-ogel-candidate", title: "Controlled item with a proposed OGEL",
    input: {
      ...ukBase, control_classification: "UK strategic list entry (caller assertion)",
      technical_specifications: { ...ukBase.technical_specifications, uk_strategic_listed: true, ogel_candidate: true },
      documents: [{ type: "uk_ogel_registration", reference: "Demo SPIRE registration requiring validation", expires_on: "2026-09-01" }],
    },
  },
  {
    id: "gb-sanctions-diversion", title: "UK export with indirect Russia diversion concerns",
    input: { ...ukBase, end_use_flags: ["diversion"], end_use: "Distributor cannot confirm ultimate recipient" },

  },
  {
    id: "eu-controlled-status-unknown", title: "EU item classification supplied but Annex I status missing",
    input: { ...euBase, technical_specifications: { eu_annex_iv_listed: false } },

  },
  {
    id: "eu-intra-union-annex-i-nonmatch", title: "Ordinary Annex I intra-EU transfer without Annex IV status",
    input: { ...euBase, to_country: "FR", technical_specifications: { eu_annex_i_listed: true, eu_annex_iv_listed: false } },

  },
  {
    id: "eu-food-origin-unknown", title: "Food origin and commodity details missing",
    input: {
      ...euBase, product: "Food ingredients", from_country: "BR", to_country: "NL", origin_country: undefined,
      product_category: "food_agriculture", hs_code: undefined, technical_specifications: {},
    },
  },
  {
    id: "gb-export-region-unknown", title: "UK controlled item without Great Britain or Northern Ireland detail",
    input: { ...ukBase, technical_specifications: { uk_strategic_listed: true, ecju_end_use_notification: false, ogel_candidate: false } },

  },
  {
    id: "gb-northern-ireland-scope", title: "Northern Ireland item requires a separate territorial assessment",
    input: {
      ...ukBase, to_country: "FR", technical_specifications: { ...ukBase.technical_specifications, uk_strategic_listed: true, uk_export_region: "northern_ireland" },
    },
  },
  {
    id: "gb-public-brochure-nonmatch", title: "Caller-confirmed non-controlled public brochure transfer",
    input: {
      ...ukBase, product: "Public product brochure", transaction_type: "technology_transfer", product_category: "general_goods",
      technical_specifications: { ...ukBase.technical_specifications, uk_controlled_technology: false },
    },
  },
];

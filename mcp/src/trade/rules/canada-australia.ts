import type { LegalSource, TradeRule } from "../types.js";

const canadaFood: LegalSource = {
  title: "CFIA: Importing food to Canada, overview",
  url: "https://inspection.canada.ca/en/food-safety-industry/toolkit-food-businesses/importing-food",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const canadaExport: LegalSource = {
  title: "Global Affairs Canada: Guide to Canada's Export Control List",
  url: "https://www.international.gc.ca/trade-commerce/controls-controles/ecl-lec/index.aspx?lang=eng",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const canadaCommercialImport: LegalSource = {
  title: "CBSA: Guide to importing commercial goods into Canada",
  url: "https://www.cbsa-asfc.gc.ca/import/guide-eng.html",
  verified_as_of: "2026-10-18", verification_status: "verified_guidance",
};
const bicon: LegalSource = {
  title: "DAFF: Biosecurity Import Conditions system (BICON)",
  url: "https://www.agriculture.gov.au/import/online-services/bicon",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const biconPermit: LegalSource = {
  title: "DAFF: BICON import permits, including grant before arrival",
  url: "https://www.agriculture.gov.au/import/online-services/bicon/bicon-permit",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const australiaExport: LegalSource = {
  title: "Australian Defence: Defence and Strategic Goods List",
  url: "https://www.defence.gov.au/business-industry/exporting/export-controls-framework/defence-strategic-goods-list",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const australiaExceptions: LegalSource = {
  title: "Australian Defence: Licence-free environment",
  url: "https://www.defence.gov.au/business-industry/exporting/applications-pre-notifications/licence-free-environment",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};

export const canadaAustraliaRules: readonly TradeRule[] = [
  {
    id: "CA-IMPORT-GENERAL-GOODS-READINESS", version: "1.0.0", jurisdiction: "CA", direction: "import",
    title: "Canadian general commercial-goods import readiness",
    categories: ["general_goods"], transaction_types: ["shipment", "reexport"],
    evidence_mode: "advisory",
    conditions: { field: "to_country", op: "eq", value: "CA" },
    required_inputs: ["origin_country", "hs_code", "classification_evidence", "quantity", "value", "currency",
      "technical_specifications.importer_bn15", "end_user", "end_use"],
    finding: "DOCUMENT_REQUIRED",
    explanation: "For this narrow general-goods scenario, retain the importer account identifier, commercial invoice, origin, value and proposed customs classification before presenting the shipment for Canadian release. Supplied facts remain unverified, and product-specific controls, tariff treatment, duties, taxes, marking and other-agency requirements remain outside this basic check.",
    required_documents: ["classification_record", "commercial_invoice", "canada_importer_account_confirmation"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect the importer BN15/CARM account confirmation, commercial invoice, origin, value, quantity and proposed Canadian tariff classification." },
      { owner: "human", instruction: "Validate the importer account, invoice, origin, value and 10-digit Canadian tariff classification; separately confirm product-specific controls, tariff treatment, duties, taxes and release instructions." },
    ], sources: [canadaCommercialImport],
  },
  {
    id: "CA-IMPORT-FOOD-REVIEW", version: "1.0.0", jurisdiction: "CA", direction: "import",
    title: "Determine Canadian food-import licensing and commodity conditions",
    categories: ["food_agriculture"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "CA" },
    required_inputs: ["origin_country", "technical_specifications.food_commodity", "technical_specifications.processing", "technical_specifications.intended_use", "technical_specifications.importer_business_activity"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Food importers generally need to consider SFC licensing, preventive controls and traceability. Determine applicability and commodity conditions using CFIA guidance and AIRS. The broad agriculture category also includes non-food goods; this rule does not conclude that every agricultural shipment needs a food license or written preventive control plan.",
    required_documents: ["canada_food_import_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect commodity, origin, processing, intended use and importer activity; retain an AIRS/CFIA lookup for the exact shipment." },
      { owner: "human", instruction: "Confirm food scope and applicable SFC licensing, preventive control, traceability and commodity requirements; record exceptions and required shipment documents." },
    ], sources: [canadaFood],
  },
  {
    id: "CA-EXPORT-ECL-CLASSIFICATION", version: "1.0.0", jurisdiction: "CA", direction: "export",
    title: "Classify against Canada's Export Control List",
    categories: ["dual_use", "advanced_computing", "encryption", "military", "nuclear"],
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "CA" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.performance", "end_user", "end_use"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "The ECL defines controlled goods and technology using technical entries. Determine the applicable edition, entry, destination conditions and permit route. The product category is a triage cue; this pack does not encode all ECL entries, destination exceptions or General Export Permit conditions.",
    required_documents: ["classification_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect technical specifications, manufacturer evidence and proposed ECL group/entry." },
      { owner: "human", instruction: "Verify the current ECL entry, destination/end-use controls and whether an individual permit, General Export Permit or applicable exception covers the transaction." },
    ], sources: [canadaExport],
  },
  {
    id: "AU-IMPORT-BIOSECURITY-REVIEW", version: "1.0.0", jurisdiction: "AU", direction: "import",
    title: "Determine Australian BICON commodity conditions",
    categories: ["food_agriculture", "wildlife"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "AU" },
    required_inputs: ["origin_country", "technical_specifications.commodity", "technical_specifications.processing", "technical_specifications.intended_use", "technical_specifications.bicon_case_reference"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Australian biosecurity requirements vary by commodity, origin, processing and use. BICON determines admissibility, documentation, treatment and any permit requirement. This pack requires a commodity-case review and does not infer that every food, plant or animal product requires a permit.",
    required_documents: ["bicon_conditions_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Identify and retain the BICON case for the exact commodity, origin, processing and intended use; record any required treatment and documents." },
      { owner: "human", instruction: "Validate BICON admissibility and permit conditions; for food intended for sale, also assess imported-food safety requirements and inspection conditions." },
    ], sources: [bicon],
  },
  {
    id: "AU-IMPORT-CONFIRMED-BICON-PERMIT", version: "1.0.0", jurisdiction: "AU", direction: "import",
    title: "Permit before arrival when the BICON case requires one",
    categories: ["food_agriculture", "wildlife"], transaction_types: ["shipment", "reexport"],
    conditions: { all: [
      { field: "to_country", op: "eq", value: "AU" },
      { field: "technical_specifications.bicon_permit_required", op: "exists" },
      { field: "technical_specifications.bicon_permit_required", op: "eq", value: true },
      { field: "technical_specifications.bicon_case_reference", op: "exists" },
    ] },
    required_inputs: ["origin_country", "technical_specifications.bicon_case_reference"],
    finding: "LICENSE_REQUIRED",
    explanation: "The caller supplies a BICON case stating that this commodity requires a biosecurity import permit. The permit must be granted before arrival, with its conditions met. A reviewer must verify that the selected case and permit cover this shipment; filing an application does not establish authorization.",
    required_documents: ["australia_biosecurity_import_permit", "bicon_conditions_review"],
    remediation_steps: [
      { owner: "human", instruction: "Verify the BICON case and obtain or validate a granted biosecurity import permit before the goods arrive; check its commodity, origin, processing and use conditions." },
      { owner: "agent", instruction: "Collect the granted permit reference and required treatment or supporting records for review." },
    ], sources: [bicon, biconPermit],
  },
  {
    id: "AU-EXPORT-DSGL-CLASSIFICATION", version: "1.0.0", jurisdiction: "AU", direction: "export",
    title: "Classify against Australia's Defence and Strategic Goods List",
    categories: ["dual_use", "advanced_computing", "encryption", "military", "nuclear"],
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "AU" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.performance", "end_user", "end_use"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "DSGL scope depends on the technical entry and transfer type. Determine classification and authorization requirements, including applicable exemptions and licence-free environment conditions. This pack does not conclude that every military or dual-use category item needs an individual permit.",
    required_documents: ["classification_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect technical specifications, proposed DSGL entry and the identities/locations of transfer participants." },
      { owner: "human", instruction: "Validate DSGL scope and the applicable export/supply rules, then assess permit requirements and any licence-free exemption, excluded item or other conditions." },
    ], sources: [australiaExport, australiaExceptions],
  },
];

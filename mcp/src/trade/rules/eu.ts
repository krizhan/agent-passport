import type { Category, LegalSource, TradeRule } from "../types.js";

const source = (title: string, url: string): LegalSource => ({
  title, url, verified_as_of: "2026-10-17", verification_status: "verified_guidance",
});
const dualUse = source("European Commission: exporting dual-use items",
  "https://policy.trade.ec.europa.eu/help-exporters-and-importers/exporting-dual-use-items_en");
const traces = source("European Commission: how TRACES works",
  "https://food.ec.europa.eu/horizontal-topics/traces/how-does-traces-work_en");
const wildlife = source("European Commission: EU wildlife trade regulations",
  "https://environment.ec.europa.eu/topics/nature-and-biodiversity/wildlife-trade_en");
const waste = source("European Commission: waste shipments and application timeline",
  "https://environment.ec.europa.eu/topics/waste-and-recycling/waste-shipments_en");
const sanctions = source("European Commission: sanctions due diligence guidance",
  "https://finance.ec.europa.eu/publications/guidance-due-diligence_en");

// Explicit caller assertions select scenarios; they are never independently verified classifications.
const members = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"] as const;
const strategic: readonly Category[] = ["dual_use", "advanced_computing", "encryption", "nuclear", "chemicals"];
const base = { version: "1.0.0", jurisdiction: "EU" } as const;

export const euRules: readonly TradeRule[] = [
  {
    ...base, id: "EU-EXPORT-CLASSIFICATION", direction: "export", title: "Establish the EU control entry",
    categories: strategic,
    conditions: { any: [
      { not: { field: "control_classification", op: "exists" } },
      { not: { field: "classification_evidence", op: "exists" } },
    ] },
    required_inputs: ["control_classification", "classification_evidence"], finding: "CLASSIFICATION_REQUIRED",
    explanation: "The scenario category does not determine Annex I status. Establish the entry and applicable national controls.",
    required_documents: ["eu_classification_assessment"],
    remediation_steps: [{ owner: "human", instruction: "Review specifications against the current EU and exporting Member State lists." }],
    sources: [dualUse],
  },
  {
    ...base, id: "EU-ANNEX-I-EXPORT", direction: "export", title: "Annex I export authorization",
    categories: strategic,
    conditions: { all: [
      { field: "technical_specifications.eu_annex_i_listed", op: "eq", value: true },
      { not: { field: "to_country", op: "in", value: members } },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"], finding: "LICENSE_REQUIRED",
    explanation: "Caller-asserted Annex I items exported outside the EU need authorization. Supplied evidence and authorizations require human validation.",
    required_documents: ["eu_export_authorization"],
    remediation_steps: [{ owner: "human", instruction: "Confirm classification and applicable authorization with the national licensing authority." }],
    sources: [dualUse],
  },
  {
    ...base, id: "EU-ANNEX-IV-TRANSFER", direction: "export", title: "Sensitive intra-EU transfer",
    categories: strategic,
    conditions: { all: [
      { field: "technical_specifications.eu_annex_iv_listed", op: "eq", value: true },
      { field: "to_country", op: "in", value: members },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"], finding: "LICENSE_REQUIRED",
    explanation: "Annex IV items require prior authorization for intra-EU transfer; other intra-EU controls remain outside this scenario.",
    required_documents: ["eu_intra_union_transfer_authorization"],
    remediation_steps: [{ owner: "human", instruction: "Validate Annex IV status and obtain the relevant transfer authorization." }],
    sources: [dualUse],
  },
  {
    ...base, id: "EU-END-USE-REVIEW", direction: "export", title: "Catch-all and surveillance review",
    conditions: { any: [
      { field: "end_use_flags", op: "contains", value: "wmd" },
      { field: "end_use_flags", op: "contains", value: "military" },
      { field: "end_use_flags", op: "contains", value: "surveillance" },
    ] },
    required_inputs: ["end_user", "end_use", "classification_evidence"], finding: "END_USE_REVIEW",
    explanation: "Risk flags trigger catch-all review, including non-listed items; a flag alone establishes neither a licensing duty nor prohibition.",
    required_documents: ["eu_end_use_review"],
    remediation_steps: [{ owner: "human", instruction: "Resolve end-use concerns with the national competent authority." }], sources: [dualUse],
  },
  {
    ...base, id: "EU-GENERAL-AUTHORIZATION-CANDIDATE", direction: "export", title: "Consider EU001 authorization",
    categories: strategic,
    conditions: { all: [
      { field: "technical_specifications.eu_annex_i_listed", op: "eq", value: true },
      { field: "to_country", op: "in", value: ["AU", "CA", "IS", "JP", "NZ", "NO", "CH", "LI", "GB", "US"] },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"],
    finding: "GENERAL_AUTHORIZATION_POSSIBLE",
    explanation: "EU001 may apply. Destination alone never establishes eligibility; exclusions, notification and use conditions require review.",
    required_documents: ["eu001_eligibility_assessment"],
    remediation_steps: [{ owner: "human", instruction: "Check Annex II and national registration requirements before relying on EU001." }],
    sources: [dualUse],
  },
  {
    ...base, id: "EU-FOOD-IMPORT-REVIEW", direction: "import", title: "Food and agriculture admissibility review",
    transaction_types: ["shipment", "reexport"],
    categories: ["food_agriculture"],
    conditions: { not: { field: "from_country", op: "in", value: members } },
    required_inputs: ["origin_country", "hs_code", "technical_specifications.food_type"], finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Determine the commodity-specific food, feed, animal or plant import controls. Certificates and border procedures vary; this category does not establish them.",
    required_documents: ["eu_food_admissibility_assessment"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect ingredients, processing, origin and establishment details for the importer." },
      { owner: "human", instruction: "Identify applicable official certificates, TRACES procedures and entry-point requirements." },
    ], sources: [traces],
  },
  {
    ...base, id: "EU-FOOD-OFFICIAL-CERTIFICATE", direction: "import", title: "Official food or plant certificate",
    transaction_types: ["shipment", "reexport"],
    categories: ["food_agriculture"],
    conditions: { all: [
      { not: { field: "from_country", op: "in", value: members } },
      { field: "technical_specifications.eu_official_certificate_required", op: "eq", value: true },
    ] },
    required_inputs: ["origin_country", "hs_code", "technical_specifications.food_type"], finding: "DOCUMENT_REQUIRED",
    explanation: "The caller confirms an official certificate applies. Validate the correct model and TRACES workflow; supplied documents are not authenticated by this tool.",
    required_documents: ["eu_official_sps_certificate", "eu_traces_entry_record"],
    remediation_steps: [{ owner: "human", instruction: "Arrange the applicable certificate and required pre-notification with the importer and authorities." }],
    sources: [traces],
  },
  {
    ...base, id: "EU-WILDLIFE-IMPORT-REVIEW", direction: "import", title: "Wildlife species and permit review",
    transaction_types: ["shipment", "reexport"],
    categories: ["wildlife"],
    conditions: { not: { field: "from_country", op: "in", value: members } },
    required_inputs: ["origin_country", "technical_specifications.scientific_name", "technical_specifications.specimen_source"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Check the exact species, specimen and EU annex listing. Permits, certificates and import suspensions depend on those facts; wildlife category alone is insufficient.",
    required_documents: ["eu_wildlife_listing_and_permit_assessment"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect scientific name, specimen form, source code and acquisition history." },
      { owner: "human", instruction: "Confirm current annex status and necessary import/export documents with the national CITES authority." },
    ], sources: [wildlife],
  },
  {
    ...base, id: "EU-WASTE-MOVEMENT-REVIEW", direction: "export", title: "Waste movement procedure review",
    transaction_types: ["shipment", "reexport", "transit"],
    categories: ["waste"],
    required_inputs: ["technical_specifications.waste_code", "technical_specifications.hazardous", "technical_specifications.recovery_or_disposal"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Waste classification, treatment and route determine notification, consent or information duties and possible bans. Regulation 2024/1157 has staged application dates; this review does not assume all new export provisions already apply.",
    required_documents: ["eu_waste_shipment_procedure_assessment"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect waste composition, code, treatment facility and complete shipping route." },
      { owner: "human", instruction: "Determine the applicable regime on the planned date, destination restrictions, consent and DIWASS requirements." },
    ], sources: [waste],
  },
  {
    ...base, id: "EU-SANCTIONS-DIVERSION-REVIEW", direction: "export", title: "Sanctions and diversion due diligence",
    conditions: { any: [
      { field: "to_country", op: "eq", value: "RU" },
      { field: "end_use_flags", op: "contains", value: "diversion" },
    ] },
    required_inputs: ["hs_code", "end_user", "end_use"], finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Russia routes and stated diversion risk are curated review triggers, not a complete sanctions policy or automatic prohibition. U.S. CSL screening does not cover EU sanctions or ownership analysis.",
    required_documents: ["eu_sanctions_due_diligence"],
    remediation_steps: [{ owner: "human", instruction: "Review current EU measures, counterparties and ownership, ultimate destination, item restrictions and any authorization with the national competent authority." }],
    sources: [sanctions],
  },
];

import type { LegalSource, TradeRule } from "../types.js";

const verified = (title: string, url: string): LegalSource => ({
  title, url, verified_as_of: "2026-10-17", verification_status: "verified_guidance",
});

// These packs route an assessment; categories are caller assertions, not legal classifications.
export const usImportRules: readonly TradeRule[] = [
  {
    id: "us-import-entry-documents", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "U.S. commercial merchandise entry evidence",
    transaction_types: ["shipment", "reexport"],
    conditions: { all: [{ field: "to_country", op: "eq", value: "US" }, { not: { field: "from_country", op: "eq", value: "US" } }] },
    required_inputs: ["origin_country", "hs_code", "quantity", "value", "currency"],
    finding: "DOCUMENT_REQUIRED",
    explanation: "Prepare customs entry evidence, including an invoice identifying merchandise, origin, quantities, and value. The HS code is a customs classification, not an export-control classification. This scenario does not calculate duties or select a customs entry procedure.",
    required_documents: ["commercial_invoice", "customs_classification_record"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect manufacturer origin, proposed HTS classification, invoice, packing details, quantities, currency, and itemized charges for the customs broker." },
      { owner: "human", instruction: "Have the importer or customs broker confirm classification, valuation, origin, admissibility, and the applicable entry procedure before filing." },
    ],
    sources: [verified("19 CFR 141.86: invoice contents and general requirements", "https://www.ecfr.gov/current/title-19/chapter-I/part-141/subpart-F/section-141.86")],
  },
  {
    id: "us-import-food-fda", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "Food import: FDA scope and prior-notice review",
    categories: ["food_agriculture"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "US" },
    required_inputs: ["origin_country", "technical_specifications.food_type", "technical_specifications.manufacturer", "technical_specifications.intended_food_use"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Food imports need an FDA applicability assessment covering prior notice, facility registration, labeling, and foreign-supplier verification where applicable. The broad food/agriculture category alone does not establish each filing requirement or an FDA import license.",
    required_documents: ["food_import_applicability_record"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect food type, ingredients, processing, producer, country of origin, intended use, and the responsible U.S. importer; assemble an FDA applicability checklist." },
      { owner: "human", instruction: "Confirm FDA versus USDA jurisdiction and any exemptions; arrange applicable prior notice, facility registration, FSVP records, and compliant labels before shipment." },
    ],
    sources: [verified("FDA: importing food products into the United States", "https://www.fda.gov/food/food-imports-exports/importing-food-products-united-states")],
  },
  {
    id: "us-import-plants-aphis", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "Plant commodity import: APHIS commodity/origin lookup",
    categories: ["food_agriculture"], transaction_types: ["shipment", "reexport"],
    conditions: { all: [{ field: "to_country", op: "eq", value: "US" }, { field: "technical_specifications.plant_material", op: "eq", value: true }] },
    required_inputs: ["origin_country", "technical_specifications.botanical_name", "technical_specifications.plant_part", "technical_specifications.processing"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "APHIS plant import requirements depend on the exact commodity and origin. Check ACIR for admissibility, permits, certificates, and treatments; this pack does not reproduce ACIR commodity decisions.",
    required_documents: ["aphis_commodity_requirements_record"],
    remediation_steps: [
      { owner: "agent", instruction: "Capture botanical name, plant part, processing, planting/consumption purpose, and growing origin; prepare the corresponding ACIR query." },
      { owner: "human", instruction: "Verify the current ACIR result and federal orders; obtain any required APHIS permit, phytosanitary certificate, and treatment evidence before shipping." },
    ],
    sources: [verified("APHIS: how to import plants and plant products", "https://www.aphis.usda.gov/plant-imports/how-to-import")],
  },
  {
    id: "us-import-medical-device", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "Medical import: product jurisdiction and device requirements",
    categories: ["medical"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "US" },
    required_inputs: ["technical_specifications.medical_product_type", "technical_specifications.intended_medical_use", "technical_specifications.manufacturer"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Determine whether the product is a medical device, drug, biologic, or combination product. For devices, FDA checks applicable registration/listing, premarket submission, labeling, and import-alert requirements. This scenario covers device review and does not implement drug or biologic import requirements.",
    required_documents: ["medical_product_regulatory_assessment"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect intended use, manufacturer/model, labeling, proposed FDA product code/class, and any registration, listing, clearance, approval, or exemption references." },
      { owner: "human", instruction: "Confirm FDA product jurisdiction and device requirements. Validate applicable registration/listing and premarket authorization; route drugs, biologics, and combination products for a separate assessment." },
    ],
    sources: [verified("FDA: importing medical devices", "https://www.fda.gov/industry/importing-fda-regulated-products/importing-medical-devices")],
  },
  {
    id: "us-import-chemicals-tsca", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "Chemical import: TSCA scope and certification assessment",
    categories: ["chemicals"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "US" },
    required_inputs: ["technical_specifications.chemical_identity", "technical_specifications.chemical_form", "end_use"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Assess TSCA chemical status, inventory/new-use restrictions, and whether positive or negative import certification is required. Chemicals in articles have different certification treatment, and other agency regimes can apply; the category alone does not establish certification or admissibility.",
    required_documents: ["chemical_regulatory_assessment", "safety_data_sheet"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect CAS/chemical identities, mixture composition, intended use, physical form, SDS, and whether the chemical is imported as part of an article." },
      { owner: "human", instruction: "Confirm TSCA applicability, inventory and significant-new-use status, chemical-specific restrictions, and the correct certification or exemption; arrange any required filing with the broker." },
    ],
    sources: [verified("EPA: TSCA requirements for importing chemicals", "https://www.epa.gov/tsca-import-export-requirements/tsca-requirements-importing-chemicals")],
  },
  {
    id: "us-import-wildlife-fws", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "Wildlife import: species, declaration, and permit review",
    categories: ["wildlife"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "US" },
    required_inputs: ["origin_country", "technical_specifications.scientific_name", "technical_specifications.specimen_source", "technical_specifications.specimen_type"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "FWS requirements depend on species, specimen type/source, shipment purpose, and exemptions. Review Form 3-177, commercial import/export licensing, designated ports, and protected-species permits. A wildlife category does not establish CITES listing or prohibition.",
    required_documents: ["wildlife_species_and_permit_assessment"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect scientific name, specimen form, wild/captive source, origin, acquisition records, purpose, and proposed entry port." },
      { owner: "human", instruction: "Verify current CITES/ESA and other species controls; confirm any declaration/license exemptions, permits, designated port, and FWS inspection arrangements before shipment." },
    ],
    sources: [verified("FWS: information for importers and exporters", "https://www.fws.gov/program/office-of-law-enforcement/information-importers-exporters")],
  },
  {
    id: "us-import-forced-labor-review", version: "1.0.0", jurisdiction: "US", direction: "import",
    title: "Forced-labor concern: supply-chain admissibility review",
    transaction_types: ["shipment", "reexport"],
    conditions: { all: [{ field: "to_country", op: "eq", value: "US" }, { field: "end_use_flags", op: "contains", value: "forced_labor" }] },
    required_inputs: ["origin_country", "technical_specifications.supply_chain_traceability"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "A reported forced-labor concern requires review of producers and component sourcing against applicable import restrictions and CBP actions. A risk flag is not proof of forced labor or an established prohibition; the pack does not bundle current WROs, findings, or the UFLPA Entity List.",
    required_documents: ["supply_chain_traceability_record", "forced_labor_due_diligence_record"],
    remediation_steps: [
      { owner: "agent", instruction: "Map manufacturers and upstream component/raw-material suppliers; collect purchase, production, transport, and labor due-diligence records." },
      { owner: "human", instruction: "Review current CBP WROs/findings and UFLPA applicability with the importer; resolve the concern and document admissibility before releasing the shipment for execution." },
    ],
    sources: [verified("19 CFR 12.42–12.43: forced-labor findings and proof of admissibility", "https://www.ecfr.gov/current/title-19/chapter-I/part-12#p-12.42")],
  },
];

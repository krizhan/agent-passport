import type { LegalSource, TradeRule } from "../types.js";

const source = (title: string, url: string): LegalSource => ({ title, url,
  verified_as_of: "2026-10-17", verification_status: "verified_guidance" });
const hs = source("WCO: What is the Harmonized System?", "https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx");
const classification = source("BIS: Classify your item", "https://www.bis.gov/licensing/classify-your-item");
const ofac = source("OFAC: Entities Owned by Blocked Persons (50% Rule)", "https://ofac.treasury.gov/faqs/topic/1521");

export const commonRules: readonly TradeRule[] = [
  {
    id: "common.physical-classification", version: "1.0.0", jurisdiction: "GLOBAL", direction: "general",
    title: "Physical goods classification and origin evidence", transaction_types: ["shipment", "reexport", "transit"],
    evidence_mode: "advisory",
    required_inputs: ["product_category", "origin_country", "hs_code", "classification_evidence"], finding: "CLASSIFICATION_REQUIRED",
    explanation: "Collect origin and customs-classification evidence for the physical goods. The category and supplied HS code are caller assertions; national tariff extensions and admissibility still require review. This is an assessment input requirement, not a universal permit requirement.",
    required_documents: ["classification_record"], sources: [hs],
    remediation_steps: [{ owner: "agent", instruction: "Obtain the manufacturer/model, composition, manufacturing origin, and classification record; have a reviewer validate the destination tariff code." }],
  },
  {
    id: "common.technology-classification", version: "1.0.0", jurisdiction: "GLOBAL", direction: "general",
    title: "Software and technology classification evidence", transaction_types: ["technology_transfer"],
    required_inputs: ["product_category", "control_classification", "classification_evidence", "end_user", "end_use"], finding: "CLASSIFICATION_REQUIRED",
    explanation: "Identify the software/technology, applicable export jurisdiction and technical classification. No physical-goods HS code is requested for this scenario. BIS guidance is a U.S. reference; other jurisdictions require their own classification review.",
    required_documents: ["classification_record"], sources: [classification],
    remediation_steps: [{ owner: "human", instruction: "Review the technology, access location, recipient and national control entry before providing electronic access or technical assistance." }],
  },
  {
    id: "common.party-evidence", version: "1.0.0", jurisdiction: "GLOBAL", direction: "screening",
    title: "Transaction party and end-use information", required_inputs: ["parties", "end_user", "end_use"], finding: "RESTRICTED_PARTY_REVIEW",
    explanation: "Collect the parties and end-use evidence for review. The bundled U.S. CSL search does not cover all sanctions, ownership, end-use, or non-U.S. restrictions. Collecting a party name does not resolve identity.",
    required_documents: [], sources: [{ title: "U.S. Consolidated Screening List", url: "https://www.trade.gov/consolidated-screening-list", verified_as_of: "2026-10-17", verification_status: "verified_guidance" }],
    remediation_steps: [{ owner: "agent", instruction: "Provide exporter, importer, consignee, intermediaries and end-user names/identifiers; confirm the intended use and obtain jurisdiction-specific screening review." }],
  },
  {
    id: "common.reexport-jurisdiction", version: "1.0.0", jurisdiction: "GLOBAL", direction: "export", transaction_types: ["reexport"],
    title: "Reexport and extraterritorial jurisdiction review", required_inputs: ["origin_country", "control_classification", "classification_evidence", "technical_specifications.us_content_review"],
    finding: "HUMAN_REVIEW_REQUIRED", required_documents: ["jurisdiction_analysis"], sources: [classification],
    explanation: "Reexport jurisdiction cannot be resolved from the shipping country or manufacturing origin alone. Review U.S. content, foreign-direct-product exposure and other applicable national retransfer controls. No de minimis or FDP calculation is implemented.",
    remediation_steps: [{ owner: "human", instruction: "Document the applicable reexport/retransfer jurisdiction and current control rules, including U.S. content or technology where relevant." }],
  },
  {
    id: "us.ownership-review", version: "1.0.0", jurisdiction: "US", direction: "screening",
    title: "OFAC aggregate blocked ownership review",
    activation: { field: "ownership.blocked_ownership_percent", op: "exists" },
    conditions: { field: "ownership.blocked_ownership_percent", op: "gte", value: 50 },
    required_inputs: ["ownership.evidence", "parties"], finding: "RESTRICTED_PARTY_REVIEW", required_documents: ["ownership_analysis"], sources: [ofac],
    explanation: "A supplied aggregate blocked-ownership share of at least 50 percent triggers review of OFAC's ownership rule. Validate blocked status, direct/indirect ownership, aggregate calculation and authorization; caller-supplied percentages do not establish a confirmed prohibition. Control alone is not the OFAC 50 Percent Rule.",
    remediation_steps: [{ owner: "human", instruction: "Resolve the ownership chain and source-agency restrictions, preserving evidence and any applicable authorization. Review other jurisdictions' control tests separately." }],
  },
];

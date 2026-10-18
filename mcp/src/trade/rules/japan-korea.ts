import type { LegalSource, TradeRule } from "../types.js";

const japanSource: LegalSource = {
  title: "METI: Security Export Control System in Japan and official guidance",
  url: "https://www.meti.go.jp/policy/anpo/englishpage.html",
  // Search-index guidance was visible, but the full METI page returned HTTP 403 during verification.
  verified_as_of: null, verification_status: "reference_only",
};
const japanTechnology: LegalSource = {
  title: "METI: Guidance for Control of Sensitive Technologies for Academic and Research Institutions, 4th edition",
  url: "https://www.meti.go.jp/policy/anpo/law_document/tutatu/t07sonota/t07sonota_jishukanri03_eng.pdf",
  // The full official PDF returned HTTP 403; retain it as a review reference, not a verified source.
  verified_as_of: null, verification_status: "reference_only",
};
const koreaSource: LegalSource = {
  title: "YESTRADE: export licensing overview and strategic-item/catch-all review (official Korean guidance)",
  url: "https://www.yestrade.go.kr/export-permissions/guide/overview",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};

export const japanKoreaRules: readonly TradeRule[] = [
  {
    id: "JP-EXPORT-STRATEGIC-CLASSIFICATION", version: "1.0.0", jurisdiction: "JP", direction: "export",
    title: "Japanese strategic-item classification and transaction review",
    categories: ["dual_use", "advanced_computing", "encryption", "military", "nuclear"],
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "JP" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.performance", "end_user", "end_use"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "METI's security export controls require assessment of the item, destination, end user and end use. Classify under the applicable list and assess catch-all conditions. This pack does not contain the complete Japanese list, current preferred-destination mapping or license exemptions.",
    required_documents: ["classification_review", "end_use_statement"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect manufacturer technical specifications, proposed Japanese control entry and destination/end-user/end-use evidence." },
      { owner: "human", instruction: "Validate list scope, current destination treatment, catch-all conditions and licensing/exemption eligibility using current METI guidance." },
    ], sources: [japanSource],
  },
  {
    id: "JP-EXPORT-TECHNOLOGY-REVIEW", version: "1.0.0", jurisdiction: "JP", direction: "export",
    title: "Japanese technology-transfer scope review",
    transaction_types: ["technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "JP" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.technology_content", "technical_specifications.recipient_status", "end_user", "end_use"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "A technology transfer can require security export review even without a physical shipment. Determine the technical content, recipient status, transfer method and applicable exclusions. This scenario does not treat every file, research exchange or software transfer as controlled.",
    required_documents: ["technology_transfer_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Describe the technology, transfer method and recipient relationship/status, and collect classification evidence." },
      { owner: "human", instruction: "Assess controlled technology and catch-all scope, recipient/deemed-export conditions and applicable exclusions before release." },
    ], sources: [japanTechnology],
  },
  {
    id: "KR-EXPORT-STRATEGIC-CLASSIFICATION", version: "1.0.0", jurisdiction: "KR", direction: "export",
    title: "Korean strategic-item classification and permit review",
    categories: ["dual_use", "advanced_computing", "encryption", "military", "nuclear"],
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "KR" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.performance", "end_user", "end_use"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "Korean strategic-item controls require classification and review of destination, end user, end use and available permit exemptions. A category label does not establish strategic-item status. This pack does not contain all Korean technical entries, catch-all items or exemption conditions.",
    required_documents: ["classification_review", "end_use_statement"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect technical specifications, proposed Korean classification and any self-classification or professional determination evidence." },
      { owner: "human", instruction: "Validate strategic-item status through YESTRADE guidance and assess export permit, exemption, reporting and destination requirements." },
    ], sources: [koreaSource],
  },
  {
    id: "KR-EXPORT-END-USE-REVIEW", version: "1.0.0", jurisdiction: "KR", direction: "export",
    title: "Korean catch-all review for declared sensitive end uses",
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { all: [
      { field: "from_country", op: "eq", value: "KR" },
      { field: "end_use_flags", op: "exists" },
      { any: [
        { field: "end_use_flags", op: "contains", value: "wmd" },
        { field: "end_use_flags", op: "contains", value: "nuclear" },
        { field: "end_use_flags", op: "contains", value: "military" },
        { field: "end_use_flags", op: "contains", value: "diversion" },
      ] },
    ] },
    required_inputs: ["end_user", "end_use", "technical_specifications.performance", "classification_evidence"],
    finding: "END_USE_REVIEW",
    explanation: "Declared sensitive-use or diversion indicators warrant a Korean catch-all assessment, including for goods outside the strategic-item list. A flag prompts review and does not alone prove that a permit is required or that the transaction is prohibited.",
    required_documents: ["end_use_statement", "korea_catch_all_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect the end user's identity, actual activities, intended use and reasons for each sensitive-use/diversion flag." },
      { owner: "human", instruction: "Assess the current Korean catch-all criteria, destination/item measures and any competent-authority notification; determine whether a situation permit is required." },
    ], sources: [koreaSource],
  },
];

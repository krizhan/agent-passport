import type { LegalSource, TradeRule } from "../types.js";

const rareEarthSource: LegalSource = {
  title: "MOFCOM/GACC Announcement No. 18 of 2025 (English reference translation; Chinese text authentic)",
  url: "https://english.mofcom.gov.cn/Policies/AnnouncementsOrders/art/2025/art_0dd87cbee7b045bf93fabe6ab2faceee.html",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const dualUseSource: LegalSource = {
  title: "PRC Regulations on Export Control of Dual-Use Items, Articles 14–16 (official Chinese text)",
  url: "https://exportcontrol.mofcom.gov.cn/article/zcfg/gnzcfg/gzjgfxwj/202410/1057.html",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};

export const chinaRules: readonly TradeRule[] = [
  {
    id: "CN-EXPORT-RARE-EARTH-CLASSIFICATION", version: "1.0.0", jurisdiction: "CN", direction: "export",
    legal_effective_from: "2025-04-04",
    title: "Classify rare-earth material against the applicable Chinese control entry",
    categories: ["rare_earth"], transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "CN" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.composition", "technical_specifications.material_form", "end_user", "end_use"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "Announcement 18 describes particular elements, compounds and material forms. A rare-earth category or HS code alone does not establish scope. This pack does not encode every later amendment, suspension, destination measure or technology control; a reviewer must establish the applicable notice and entry for the planned date.",
    required_documents: ["classification_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect composition, material form, manufacturer specifications and proposed Chinese control entry." },
      { owner: "human", instruction: "Verify the item against current MOFCOM notices and record the applicable control entry and any authorization route; review destination and end-user measures separately." },
    ], sources: [rareEarthSource, dualUseSource],
  },
  {
    id: "CN-EXPORT-CONFIRMED-RARE-EARTH-AUTHORIZATION", version: "1.0.0", jurisdiction: "CN", direction: "export",
    legal_effective_from: "2025-04-04",
    title: "Authorization for a confirmed listed rare-earth item",
    categories: ["rare_earth"], transaction_types: ["shipment", "reexport"],
    conditions: { all: [
      { field: "from_country", op: "eq", value: "CN" },
      { field: "technical_specifications.cn_rare_earth_listed", op: "exists" },
      { field: "technical_specifications.cn_rare_earth_listed", op: "eq", value: true },
      { field: "control_classification", op: "exists" },
      { field: "classification_evidence", op: "exists" },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"],
    finding: "LICENSE_REQUIRED",
    explanation: "The supplied classification evidence asserts that this item is listed under the applicable rare-earth controls. Listed exports require the applicable MOFCOM authorization. A reviewer must validate that assertion and the authorization route, conditions and scope; this rule does not decide whether a license will be granted or whether a later restriction applies.",
    required_documents: ["cn_export_authorization", "classification_review"],
    remediation_steps: [
      { owner: "human", instruction: "Confirm the asserted listed status and applicable notices, then obtain or validate the MOFCOM authorization covering this item, destination, end user, end use and date." },
      { owner: "agent", instruction: "Collect the authorization reference, technical description and end-user/end-use evidence for reviewer verification." },
    ], sources: [rareEarthSource, dualUseSource],
  },
  {
    id: "CN-EXPORT-DUAL-USE-REVIEW", version: "1.0.0", jurisdiction: "CN", direction: "export",
    legal_effective_from: "2024-12-01",
    title: "Chinese dual-use classification and authorization review",
    categories: ["dual_use", "advanced_computing", "encryption", "nuclear"],
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "CN" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.performance", "end_user", "end_use"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "The dual-use regulations require item-scope determination and provide authorization procedures for controlled items. The caller's category is a triage cue. This pack has no complete Chinese technical control list, temporary controls or destination/entity measures, so a qualified reviewer must determine their application.",
    required_documents: ["classification_review", "end_use_statement"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect performance specifications, proposed control entry, transaction description and end-user/end-use evidence." },
      { owner: "human", instruction: "Determine control-list and temporary-control scope, consult MOFCOM if classification is uncertain, and check current destination/entity measures and authorization options." },
    ], sources: [dualUseSource],
  },
];

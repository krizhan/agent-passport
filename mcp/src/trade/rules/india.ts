import type { LegalSource, TradeRule } from "../types.js";
import { check, reviewApproval } from "./checks.js";

const scometSource: LegalSource = {
  title: "DGFT Foreign Trade Policy 2023, Chapter 10: SCOMET",
  url: "https://content.dgft.gov.in/Website/dgftprod/a2f58730-df83-49df-a437-b5f6345abb66/FTP2023_Chapter10.pdf",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};
const importSource: LegalSource = {
  title: "DGFT Foreign Trade Policy 2023, Chapter 2: import/export policy and restricted goods",
  url: "https://content.dgft.gov.in/Website/dgftprod/4f665d2f-20cc-4887-ae6a-5ec912bc0d44/FTP2023_Chapter02.pdf",
  verified_as_of: "2026-10-17", verification_status: "verified_guidance",
};

export const indiaRules: readonly TradeRule[] = [
  {
    id: "IN-IMPORT-ELECTRONIC-CIGARETTE", version: "1.0.0", jurisdiction: "IN", direction: "import",
    title: "Indian electronic-cigarette prohibition and licensed-product exclusion",
    categories: ["electronic_cigarette"], transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "IN" }, required_inputs: [], finding: "PROHIBITED",
    explanation: "Declared electronic cigarettes need a prohibition assessment, including nicotine-free devices and any claimed licensed-product exclusion.",
    required_documents: [], remediation_steps: [],
    sources: [{ title: "India: Prohibition of Electronic Cigarettes Act 2019, sections 3(d) and 4",
      url: "https://www.indiacode.nic.in/bitstream/123456789/13078/1/A2019-42.pdf",
      verified_as_of: "2026-10-17", verification_status: "verified_guidance" }],
    assess(input, { plannedDate }) {
      const claimed = input.technical_specifications?.licensed_medicine_claimed;
      if (typeof claimed !== "boolean") return check("MISSING", "MEDICINAL_EXCLUSION_UNKNOWN", "Establish whether a product licence under the Drugs and Cosmetics Act is claimed. Nicotine-free status is not an exclusion.", {
        missing_fields: ["technical_specifications.licensed_medicine_claimed"],
        remediation_steps: [{ owner: "agent", instruction: "Establish the product classification and whether a statutory licensed-product exclusion is claimed." }],
      });
      if (!claimed && input.documents.some((doc) => doc.type === "medicinal_licence")) {
        return check("REVIEW", "CONFLICTING_MEDICINAL_FACTS", "A supplied medicinal licence conflicts with the negative exclusion claim.", {
          remediation_steps: [{ owner: "human", instruction: "Resolve the conflicting product and licence statements before importing." }],
        });
      }
      if (!claimed) return check("FAILED", "IN_E_CIGARETTE_PROHIBITED", "The declared electronic cigarette has no claimed licensed-product exclusion. This check includes nicotine-free devices.", {
        remediation_steps: [{ owner: "agent", instruction: "Hold this proposed electronic-cigarette import into India." }],
      });
      return reviewApproval(input, "medicinal_licence", plannedDate);
    },
  },
  {
    id: "IN-EXPORT-SCOMET-CLASSIFICATION", version: "1.0.0", jurisdiction: "IN", direction: "export",
    title: "Determine SCOMET classification and licensing authority",
    categories: ["dual_use", "advanced_computing", "encryption", "military", "nuclear", "chemicals"],
    transaction_types: ["shipment", "reexport", "technology_transfer"],
    conditions: { field: "from_country", op: "eq", value: "IN" },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.performance", "end_user", "end_use"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "SCOMET controls depend on the national control entry and technical scope. The category alone does not establish a license requirement. Listed exports may require authorization, be prohibited, or qualify for an exemption; the competent authority and available route depend on the category and transaction.",
    required_documents: ["classification_review", "end_use_statement"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect technical specifications, proposed SCOMET entry, manufacturer classification and end-user/end-use evidence." },
      { owner: "human", instruction: "Validate the current SCOMET entry and applicable notifications, identify the competent licensing authority, and determine authorization, exemption or prohibition conditions." },
    ], sources: [scometSource],
  },
  {
    id: "IN-IMPORT-ITC-HS-POLICY", version: "1.0.0", jurisdiction: "IN", direction: "import",
    title: "Check India's item-specific ITC(HS) import policy",
    transaction_types: ["shipment", "reexport"],
    conditions: { field: "to_country", op: "eq", value: "IN" },
    required_inputs: ["hs_code", "origin_country", "technical_specifications.india_itc_hs_code", "technical_specifications.india_import_policy", "technical_specifications.india_policy_evidence"],
    finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "The Indian import policy is item-specific and may impose restrictions or policy conditions. This pack requests the exact eight-digit ITC(HS) entry and a current policy lookup; it does not label every Indian import restricted or infer policy from a generic product category.",
    required_documents: ["india_import_policy_review"],
    remediation_steps: [
      { owner: "agent", instruction: "Collect the eight-digit ITC(HS) classification and dated Schedule 1 policy/notification evidence for the item, origin and intended use." },
      { owner: "human", instruction: "Validate the eight-digit code, current policy status and item-specific conditions; determine authorizations and other agency requirements." },
    ], sources: [importSource],
  },
  {
    id: "IN-IMPORT-CONFIRMED-RESTRICTED-AUTHORIZATION", version: "1.0.0", jurisdiction: "IN", direction: "import",
    title: "Authorization for an import confirmed to require a DGFT authorization",
    transaction_types: ["shipment", "reexport"],
    conditions: { all: [
      { field: "to_country", op: "eq", value: "IN" },
      { field: "technical_specifications.india_import_policy", op: "exists" },
      { field: "technical_specifications.india_import_policy", op: "eq", value: "restricted_authorization" },
      { field: "technical_specifications.india_policy_evidence", op: "exists" },
      { field: "classification_evidence", op: "exists" },
    ] },
    required_inputs: ["hs_code", "classification_evidence", "technical_specifications.india_itc_hs_code", "technical_specifications.india_policy_evidence"],
    finding: "LICENSE_REQUIRED",
    explanation: "The supplied policy evidence asserts that this item's restricted import route requires a DGFT authorization. Obtain the authorization and satisfy its conditions. A reviewer must validate the policy lookup and whether a notification prescribes a different procedure; a caller-supplied HS code alone cannot trigger this conclusion.",
    required_documents: ["india_import_authorization", "india_import_policy_review"],
    remediation_steps: [
      { owner: "human", instruction: "Validate the asserted authorization requirement and obtain or verify the DGFT authorization and all item, quantity, value, origin and port conditions." },
      { owner: "agent", instruction: "Attach the authorization reference and supporting current ITC(HS) policy evidence for review." },
    ], sources: [importSource],
  },
];

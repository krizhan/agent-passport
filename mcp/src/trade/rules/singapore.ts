import type { TradeRule } from "../types.js";
import { check, reviewApproval } from "./checks.js";

export const singaporeRules: readonly TradeRule[] = [{
  id: "SG-IMPORT-CHEWING-GUM", version: "1.0.0", jurisdiction: "SG", direction: "import",
  title: "Singapore chewing-gum prohibition and approved-product exclusion",
  categories: ["chewing_gum"], transaction_types: ["shipment", "reexport"],
  conditions: { field: "to_country", op: "eq", value: "SG" }, required_inputs: [], finding: "PROHIBITED",
  explanation: "Establish gum type and any HSA-approved oral-dental or medicinal exclusion from product-specific evidence.",
  required_documents: [], remediation_steps: [],
  sources: [{ title: "Singapore Customs: controlled and prohibited goods for imports",
    url: "https://www.customs.gov.sg/doing-business/import-operations/import-procedures/controlled-and-prohibited-goods-for-imports/",
    verified_as_of: "2026-10-17", verification_status: "verified_guidance" }],
  assess(input, { plannedDate }) {
    const type = input.technical_specifications?.gum_type;
    const claimed = input.technical_specifications?.hsa_approval_claimed;
    if (claimed !== undefined && typeof claimed !== "boolean") return check("MISSING", "HSA_APPROVAL_CLAIM_INVALID", "Supply a boolean approval claim rather than a label or text value.", {
      missing_fields: ["technical_specifications.hsa_approval_claimed"],
      remediation_steps: [{ owner: "agent", instruction: "Establish whether HSA approval is actually claimed from the product records." }],
    });
    if (typeof type !== "string" || !["ordinary", "oral_dental", "medicinal"].includes(type)) {
      return check("MISSING", "GUM_TYPE_MISSING", "Establish ordinary, oral_dental, or medicinal gum from product specifications; the product name is not a classification.", {
        missing_fields: ["technical_specifications.gum_type"],
        remediation_steps: [{ owner: "agent", instruction: "Obtain the gum type from the product specification and recheck." }],
      });
    }
    const approvalSupplied = input.documents.some((doc) => doc.type === "hsa_approval");
    if ((type === "ordinary" && (claimed === true || approvalSupplied)) || (claimed === false && approvalSupplied)) {
      return check("REVIEW", "CONFLICTING_GUM_FACTS", "The supplied gum classification or negative approval claim conflicts with an HSA approval statement or record.", {
        remediation_steps: [{ owner: "human", instruction: "Resolve the product classification and approval conflict before importing." }],
      });
    }
    if (type === "ordinary" || claimed === false) return check("FAILED", "SG_GUM_PROHIBITED", "The declared gum is outside the HSA-approved oral-dental or medicinal exclusion.", {
      remediation_steps: [{ owner: "agent", instruction: "Hold this proposed chewing-gum import into Singapore." }],
    });
    if (claimed !== true) return check("MISSING", "HSA_APPROVAL_CLAIM_MISSING", "Dental or medicinal labeling does not establish HSA approval.", {
      missing_fields: ["technical_specifications.hsa_approval_claimed"],
      remediation_steps: [{ owner: "agent", instruction: "Establish whether product-specific HSA approval is claimed and obtain its record." }],
    });
    return reviewApproval(input, "hsa_approval", plannedDate);
  },
}];

import type { PolicyRule } from "../types.js";
import { matchingEvidence, result, step } from "../helpers.js";
import { requirements } from "./requirements.js";
const id = requirements[0].id;
export const rules: readonly PolicyRule[] = [{
  requirement: requirements[0],
  evaluate(action) {
    if (action.action_type !== "purchase" || action.to_country !== "SG" || action.product_category !== "chewing_gum") {
      return result(id, "NOT_APPLICABLE", "CATEGORY_NOT_COVERED", "This rule covers declared chewing gum imported into Singapore.");
    }
    const facts = action.product_facts;
    if (!facts?.gum_type || facts.gum_type === "unknown") return result(id, "MISSING", "GUM_TYPE_MISSING",
      "The product's ordinary, oral dental, or medicinal type has not been established.", {
        missing_fields: ["product_facts.gum_type"], actions: [step(id, "request_information", "Obtain the gum type from product specifications; do not infer it from the name.", ["product_facts.gum_type"], ["product_specification"])],
      });
    if (facts.gum_type === "ordinary" && facts.hsa_approval_claimed) return result(id, "REVIEW", "CONFLICTING_GUM_FACTS",
      "An ordinary-gum classification conflicts with the claimed HSA exception.", {
        actions: [step(id, "request_review", "Resolve the conflicting product classification and claimed HSA approval before importing.")],
      });
    if (facts.gum_type === "ordinary" || facts.hsa_approval_claimed === false) return result(id, "FAILED", "SG_GUM_PROHIBITED",
      "The supplied facts identify chewing gum outside the HSA-approved oral dental or medicinal exclusion.", {
        actions: [step(id, "stop_action", "Do not proceed with this proposed import into Singapore.")],
      });
    const evidence = matchingEvidence(action, "hsa_approval");
    if (!facts.hsa_approval_claimed || !evidence.length) return result(id, "MISSING", "HSA_APPROVAL_EVIDENCE_MISSING",
      "Dental or medicinal labeling alone does not establish the approved exclusion.", {
        missing_fields: [...(!facts.hsa_approval_claimed ? ["product_facts.hsa_approval_claimed"] : []), ...(!evidence.length ? ["evidence"] : [])],
        actions: [step(id, "collect_evidence", "Obtain the product-specific HSA approval evidence and recheck; an exception claim is not approval.", ["product_facts.hsa_approval_claimed", "evidence"], ["hsa_approval"])],
      });
    return result(id, "REVIEW", "HSA_EXCEPTION_REQUIRES_REVIEW", "Product-matching approval evidence was supplied; its authenticity, scope, and current validity require review.", {
      evidence_refs: evidence.map((item) => item.id), actions: [step(id, "request_review", "Have a reviewer confirm the HSA-approved exclusion and any remaining import conditions.")],
    });
  },
}];

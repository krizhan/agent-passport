import type { PolicyRule } from "../types.js";
import { matchingEvidence, result, step } from "../helpers.js";
import { requirements } from "./requirements.js";
const id = requirements[0].id;
export const rules: readonly PolicyRule[] = [{
  requirement: requirements[0],
  evaluate(action) {
    if (action.action_type !== "purchase" || action.to_country !== "IN" || action.product_category !== "electronic_cigarette") {
      return result(id, "NOT_APPLICABLE", "CATEGORY_NOT_COVERED", "This rule covers declared electronic cigarettes imported into India.");
    }
    const claim = action.product_facts?.licensed_medicine_claimed;
    if (claim === undefined) return result(id, "MISSING", "MEDICINAL_EXCLUSION_UNKNOWN",
      "Establish whether a Drugs and Cosmetics Act medicinal-product licence is claimed; absence is unknown.", {
        missing_fields: ["product_facts.licensed_medicine_claimed"], actions: [step(id, "request_information", "Establish whether the device is a consumer vaping product or claims the statutory licensed medicinal exclusion.", ["product_facts.licensed_medicine_claimed"], ["product_specification"])],
      });
    if (!claim) return result(id, "FAILED", "IN_E_CIGARETTE_PROHIBITED",
      "The declared electronic cigarette has no claimed licensed medicinal exclusion. The prohibition includes nicotine-free devices.", {
        actions: [step(id, "stop_action", "Do not proceed with this proposed electronic-cigarette import into India.")],
      });
    const evidence = matchingEvidence(action, "medicinal_licence");
    if (!evidence.length) return result(id, "MISSING", "MEDICINAL_LICENCE_EVIDENCE_MISSING", "A licensed medicinal exclusion is claimed without product-matching evidence.", {
      missing_fields: ["evidence"], actions: [step(id, "collect_evidence", "Obtain the product-specific Drugs and Cosmetics Act licence for review.", ["evidence"], ["medicinal_licence"])],
    });
    return result(id, "REVIEW", "MEDICINAL_EXCLUSION_REQUIRES_REVIEW", "Supplied licence evidence requires review of authenticity, scope, and the statutory exclusion.", {
      evidence_refs: evidence.map((item) => item.id), actions: [step(id, "request_review", "Have a reviewer establish whether the licensed medicinal exclusion applies; other import requirements remain unassessed.")],
    });
  },
}];

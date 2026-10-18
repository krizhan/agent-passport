import type { RuleCheck, TradeInput } from "../types.js";

export function check(status: RuleCheck["status"], reason_code: string, detail: string,
  extra: Partial<Omit<RuleCheck, "status" | "reason_code" | "detail">> = {}): RuleCheck {
  return { status, reason_code, detail, missing_fields: [], evidence_refs: [], required_documents: [], remediation_steps: [], ...extra };
}
export const sameProduct = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase();

/** Product-specific approval references remain unverified even when their bindings match. */
export function reviewApproval(input: TradeInput, type: string, plannedDate: string): RuleCheck {
  const records = input.documents.map((document, index) => ({ document, index })).filter(({ document }) => document.type === type);
  const evidence_refs = records.map(({ document }) => document.reference);
  const required_documents = [type];
  const review = [{ owner: "human" as const, instruction: "Verify the product-specific approval's authenticity, validity, scope, and applicable exclusion; resolve other import requirements before acting." }];
  if (records.some(({ document }) => document.product && !sameProduct(document.product, input.product))) {
    return check("REVIEW", "APPROVAL_PRODUCT_MISMATCH", "The supplied approval references include a different product. Resolve the conflict before relying on the claimed exclusion.",
      { evidence_refs, required_documents, remediation_steps: review });
  }
  const valid = records.filter(({ document }) => !document.expires_on || document.expires_on >= plannedDate);
  const missing = valid.filter(({ document }) => !document.product).map(({ index }) => `documents.${index}.product`);
  if (!valid.length || missing.length) return check("MISSING", "APPROVAL_EVIDENCE_MISSING", "Provide a current product-bound approval reference for review. A product label or exception claim is insufficient.", {
    missing_fields: !valid.length ? ["documents"] : missing, evidence_refs, required_documents,
    remediation_steps: [{ owner: "agent", instruction: `Collect a current ${type} reference identifying this exact product, then recheck.` }],
  });
  return check("REVIEW", "APPROVAL_REQUIRES_REVIEW", "Product-matching approval references were supplied. Their authenticity, scope, and applicability to the statutory exclusion require review.",
    { evidence_refs, required_documents, remediation_steps: review });
}

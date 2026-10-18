import type { z } from "zod";
import type { ruleCheckSchema, tradeInputSchema } from "./schemas.js";

export type TradeInput = z.infer<typeof tradeInputSchema>;
export type Category = NonNullable<TradeInput["product_category"]>;
export type RuleCheck = z.infer<typeof ruleCheckSchema>;
export type Direction = "import" | "export" | "transit" | "screening" | "general";
export type FindingCode = "PROHIBITED" | "LICENSE_REQUIRED" | "GENERAL_AUTHORIZATION_POSSIBLE"
  | "DOCUMENT_REQUIRED" | "QUOTA_REQUIRED" | "RESTRICTED_PARTY_REVIEW" | "END_USE_REVIEW"
  | "CLASSIFICATION_REQUIRED" | "HUMAN_REVIEW_REQUIRED";
export type Condition =
  | { field: string; op: "eq" | "in" | "contains" | "gte" | "lte" | "exists"; value?: string | number | boolean | readonly string[] }
  | { all: readonly Condition[] } | { any: readonly Condition[] } | { not: Condition };
export interface LegalSource {
  title: string;
  url: string;
  verified_as_of: string | null;
  verification_status: "verified_guidance" | "reference_only";
}
export interface TradeRule {
  id: string;
  version: string;
  jurisdiction: string;
  direction: Direction;
  title: string;
  categories?: readonly Category[];
  transaction_types?: readonly TradeInput["transaction_type"][];
  /** Optional positive trigger. Missing or false trigger facts leave the rule out of scope. */
  activation?: Condition;
  conditions?: Condition;
  /** Advisory evidence remains a follow-up but does not prevent a no-blockers result. */
  evidence_mode?: "required" | "advisory";
  required_inputs: readonly string[];
  finding: FindingCode;
  explanation: string;
  required_documents: readonly string[];
  remediation_steps: readonly { owner: "agent" | "human"; instruction: string }[];
  sources: readonly LegalSource[];
  legal_effective_from?: string;
  legal_effective_to?: string;
  assess?: (input: TradeInput, context: { now: Date; plannedDate: string }) => RuleCheck;
}

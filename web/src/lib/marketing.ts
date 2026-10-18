export interface MarketingAssessment {
  assessed_at: string;
  decision: "BLOCK" | "NEEDS_EVIDENCE" | "REVIEW" | "NO_BLOCKERS_FOUND";
  summary: string;
  message_sha256: string;
  coverage: { checked_policies: string[]; unsupported_countries: string[]; limitations: string[] };
  requirements: { id: string; policy_id: string; title: string; status: "SATISFIED" | "FAILED" | "MISSING" | "REVIEW";
    detail: string; source_url: string | null; evidence_references: string[] }[];
  remediation_plan: { requirement_id: string; owner: string; instruction: string }[];
  proposed_corrections: { field: string; value: string; reason: string }[];
  evidence_checks: { kind: string; reference: string | null; source: string | null; observed_at: string | null; status: string; detail: string }[];
  sources: { title: string; url: string; reviewed_as_of: string }[];
}

export type Outcome = "BLOCK" | "NEEDS_EVIDENCE" | "REVIEW" | "CHECKLIST" | "ERROR" | "UNAVAILABLE";
export type Category = "trade" | "marketing" | "unknown";
export const REQUEST_LIMIT_PER_CATEGORY = 10;

export interface RequestRecord {
  id: string;
  time: string;
  tool: string;
  category: Category;
  title: string;
  route: string;
  outcome: Outcome;
  summary: string;
  durationMs: number | null;
  policy: {
    id: string | null;
    version: string | null;
    reason: string | null;
    scope: string | null;
    kind: string | null;
  };
  facts: { label: string; value: string }[];
  requirements: {
    id: string;
    title: string;
    detail: string;
    status: string | null;
    basis: string | null;
    sourceUrl: string | null;
  }[];
  nextSteps: { owner: string; instruction: string }[];
  payloadCaptured: boolean;
  execution: "not_performed" | "not_reported";
}

export interface RequestPage {
  requests: RequestRecord[];
  fetchedAt: string;
  startTime: string;
  scannedEvents: number;
  scanLimitReached: boolean;
}

export function latestRequests(records: RequestRecord[]): RequestRecord[] {
  const counts = { trade: 0, marketing: 0 };
  const seen = new Set<string>();
  return [...records].sort((a, b) => Date.parse(b.time) - Date.parse(a.time) || a.id.localeCompare(b.id))
    .filter((record) => {
      if (!record.payloadCaptured || record.outcome === "UNAVAILABLE" || !record.facts.length
        || record.category === "unknown" || seen.has(record.id) || counts[record.category] >= REQUEST_LIMIT_PER_CATEGORY) return false;
      seen.add(record.id);
      counts[record.category]++;
      return true;
    });
}

export const outcomeLabels: Record<Outcome, string> = {
  BLOCK: "Blocked",
  NEEDS_EVIDENCE: "Needs information",
  REVIEW: "Needs review",
  CHECKLIST: "Checklist returned",
  ERROR: "Request failed",
  UNAVAILABLE: "Result unavailable",
};

export const policyLabels: Record<string, string> = {
  "us-import": "US import readiness",
  "general-purchase": "International purchase review",
  "general-marketing": "Marketing email review",
};

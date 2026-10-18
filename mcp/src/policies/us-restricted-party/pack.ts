import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";

export const restrictedPartyPolicy = {
  id: "us-restricted-party", version: "0.2.0",
  scope: "Point-in-time advisory name screening against a bundled, dated JSON snapshot of the U.S. Consolidated Screening List. No live lookup is performed. Heuristic candidate retrieval is not identity verification, ownership screening, global sanctions coverage, or transaction authorization. Review the snapshot date and refresh stale data before relying on current list coverage. Original agency restrictions and wider transaction requirements need human review. No business action is executed.",
  requirements,
} as const satisfies PolicyPack;

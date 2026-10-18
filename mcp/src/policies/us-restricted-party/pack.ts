import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";

export const restrictedPartyPolicy = {
  id: "us-restricted-party", version: "0.1.0",
  scope: "Point-in-time advisory name screening against the U.S. Consolidated Screening List. Heuristic candidate retrieval is not identity verification, ownership screening, global sanctions coverage, or transaction authorization. Original agency restrictions and wider transaction requirements need human review. No business action is executed.",
  requirements,
} as const satisfies PolicyPack;

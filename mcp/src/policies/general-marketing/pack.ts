import type { PolicyPack } from "../types.js";
import { requirements } from "./requirements.js";

export const generalMarketingPolicy = {
  id: "general-marketing",
  version: "0.1.0",
  scope: "Advisory general marketing-email review checklist for one recipient country. This fallback has no country-specific legal implementation or curated legal sources. Recipient permissions, email content, sender disclosures, unsubscribe handling, suppression records, and complete campaign compliance require external review. No email is authorized or sent.",
  requirements,
} as const satisfies PolicyPack;

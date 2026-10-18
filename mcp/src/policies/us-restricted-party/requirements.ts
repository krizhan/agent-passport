import type { Requirement } from "../../schemas.js";
import { sources } from "./sources.js";

export const requirements = [
  { id: "csl_availability", title: "Bundled screening data and freshness", basis: "assessment_input", source_url: sources.guidance,
    description: "Validate the bundled CSL JSON snapshot, checksum, provenance, and source coverage. Report its generation and import dates; refresh and redeploy snapshots older than 48 hours before relying on current list coverage." },
  { id: "party_name_screening", title: "Name and alias screening", basis: "assessment_input", source_url: sources.guidance,
    description: "Compare the submitted name and aliases with every CSL record. Country does not exclude candidates." },
  { id: "identity_resolution", title: "Resolve possible identity matches", basis: "legal_readiness", source_url: sources.guidance,
    description: "A human must resolve candidate identities using addresses, identifiers, and the original agency listing; a similar name is not a confirmed identity." },
  { id: "transaction_scope", title: "Review restrictions beyond this name search", basis: "legal_readiness", source_url: sources.guidance,
    description: "Review original agency restrictions and applicable ownership, country, end-user, end-use, and licensing rules. No candidates in this U.S. name search does not clear a transaction or cover every jurisdiction." },
] as const satisfies readonly Requirement[];

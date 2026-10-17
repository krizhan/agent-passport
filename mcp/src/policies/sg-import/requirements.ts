import type { Requirement } from "../../schemas.js";
import { SOURCE_REVIEWED_AT, sources } from "./sources.js";
export const requirements = [{
  id: "sg_chewing_gum_import", title: "Singapore chewing-gum import restriction", basis: "legal_readiness",
  description: "Determine whether the declared gum is prohibited or requires review of an HSA-approved oral dental or medicinal exception.",
  source_url: sources.prohibition, legal_reference: "Singapore Customs: prohibited chewing gum and HSA-approved exclusions",
  source_reviewed_at: SOURCE_REVIEWED_AT, required_fields: ["product_category", "product_facts.gum_type"],
}] as const satisfies readonly Requirement[];

import type { Requirement } from "../../schemas.js";
import { SOURCE_REVIEWED_AT, sources } from "./sources.js";
export const requirements = [{
  id: "in_electronic_cigarette_import", title: "India electronic-cigarette import prohibition", basis: "legal_readiness",
  description: "Check declared electronic cigarettes, including nicotine-free devices, and route claimed licensed medicinal exclusions to review.",
  source_url: sources.act, legal_reference: "Prohibition of Electronic Cigarettes Act 2019, sections 3(d) and 4",
  source_reviewed_at: SOURCE_REVIEWED_AT, required_fields: ["product_category", "product_facts.licensed_medicine_claimed"],
}] as const satisfies readonly Requirement[];

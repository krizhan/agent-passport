import type { Requirement } from "../../schemas.js";
import { SOURCE_REVIEWED_AT, sources } from "./sources.js";

export const requirements = [
  {
    id: "origin_documentation",
    title: "Origin documentation",
    basis: "assessment_input",
    source_url: null,
    description: "Have a reviewer confirm manufacturing origin and applicable documentation for this route and product. This checklist does not impose a universal origin-certificate requirement.",
  },
  {
    id: "tariff_classification",
    title: "Classification review",
    basis: "assessment_input",
    source_url: sources.classification,
    description: `Have a qualified reviewer identify the applicable destination tariff classification for the product. This server does not assign HS/HTS codes or calculate duties. Source reviewed ${SOURCE_REVIEWED_AT}.`,
  },
] as const satisfies readonly Requirement[];

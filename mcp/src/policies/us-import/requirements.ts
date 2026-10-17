import type { Requirement } from "../../schemas.js";
import { SOURCE_REVIEWED_AT, sources } from "./sources.js";

export const requirements = [
  {
    id: "origin_documentation",
    title: "Origin documentation",
    basis: "legal_readiness",
    source_url: sources.invoice,
    description: `Have a reviewer confirm the manufacturing origin and applicable US invoice documentation. The cited rule requires origin information; this does not mean every purchase requires an origin certificate. Source reviewed ${SOURCE_REVIEWED_AT}.`,
  },
  {
    id: "tariff_classification",
    title: "Classification review",
    basis: "legal_readiness",
    source_url: sources.classification,
    description: `Have a qualified reviewer identify the applicable destination tariff classification for the product. This server does not assign HS/HTS codes or calculate duties. Source reviewed ${SOURCE_REVIEWED_AT}.`,
  },
] as const satisfies readonly Requirement[];

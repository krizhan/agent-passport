import type { Requirement } from "../../schemas.js";
import { SOURCE_REVIEWED_AT, sources } from "./sources.js";
export const requirements = [
  {
    id: "us_food_prior_notice_scope", title: "FDA prior-notice applicability", basis: "legal_readiness",
    description: "This evaluator covers packaged roasted coffee for commercial sale arriving in the US by air or sea. Other foods, purposes, transport modes, and exemption claims require review.",
    source_url: sources.scope, legal_reference: "21 CFR 1.277(a)-(b)", source_reviewed_at: SOURCE_REVIEWED_AT,
    required_fields: ["product_category", "product_facts.food_type", "shipment.purpose", "shipment.transport_mode"],
  },
  {
    id: "us_food_prior_notice_evidence", title: "Prior-notice confirmation evidence", basis: "legal_readiness",
    description: "Collect a confirmation number and a caller-supplied confirmation reference matching the proposed product and shipment. Authenticity and complete filing contents are not verified.",
    source_url: sources.timing, legal_reference: "21 CFR 1.279(d), (g)", source_reviewed_at: SOURCE_REVIEWED_AT,
    required_fields: ["shipment.id", "product_facts.prior_notice.confirmation_number", "product_facts.prior_notice.evidence_id", "evidence", "evidence[].shipment_id"],
  },
  {
    id: "us_food_prior_notice_timing", title: "Prior-notice filing window", basis: "legal_readiness",
    description: "Compare the supplied FDA confirmation time with the first US arrival: minimum 4 hours by air or 8 hours by sea; maximum 15 calendar days for PNSI or 30 for ABI/ACE, using the declared port time zone.",
    source_url: sources.timing, legal_reference: "21 CFR 1.279(a), (b), (d)", source_reviewed_at: SOURCE_REVIEWED_AT,
    required_fields: ["product_facts.prior_notice.confirmed_at", "product_facts.prior_notice.submission_method", "shipment.arrival_at", "shipment.arrival_timezone"],
  },
] as const satisfies readonly Requirement[];

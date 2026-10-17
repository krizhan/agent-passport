import type { Action, Purchase } from "../../schemas.js";
import type { PolicyRule } from "../types.js";
import { result, step } from "../helpers.js";
import { requirements } from "./requirements.js";

function applicability(action: Action) {
  const id = requirements[0].id;
  if (action.action_type !== "purchase" || action.to_country !== "US" || action.product_category !== "food") {
    return result(id, "NOT_APPLICABLE", "CATEGORY_NOT_COVERED", "This rule covers declared food imported into the US.");
  }
  const missing: string[] = [];
  if (!action.product_facts?.food_type || action.product_facts.food_type === "unknown") missing.push("product_facts.food_type");
  if (!action.shipment?.purpose || action.shipment.purpose === "unknown") missing.push("shipment.purpose");
  if (!action.shipment?.transport_mode || action.shipment.transport_mode === "unknown") missing.push("shipment.transport_mode");
  if (missing.length) return result(id, "MISSING", "FOOD_SHIPMENT_CONTEXT_MISSING", "Food and shipment context are needed to establish the modeled prior-notice scope.", {
    missing_fields: missing, actions: [step(id, "request_information", "Obtain food type, shipment purpose, and transport mode. Do not assume that a prior-notice exemption applies.", missing)],
  });
  if (action.product_facts?.food_type !== "packaged_roasted_coffee" || action.shipment?.purpose !== "commercial_sale"
    || !["air", "sea"].includes(action.shipment.transport_mode!)) {
    return result(id, "REVIEW", "FOOD_CONTEXT_OUTSIDE_MODELED_SCOPE", "This food type, purpose, or transport mode is outside the packaged-roasted-coffee commercial air/sea workflow. No exemption is inferred.", {
      actions: [step(id, "request_review", "Establish the applicable food-import requirements and any exemption for this actual shipment context.")],
    });
  }
  return result(id, "SATISFIED", "PRIOR_NOTICE_APPLIES", "The declared commercial packaged-roasted-coffee air/sea shipment falls within the modeled FDA prior-notice scope.");
}

function withinScope(action: Action): action is Purchase {
  return applicability(action).status === "SATISFIED";
}

function calendarDay(timestamp: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(timestamp));
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86400000;
}

export const rules: readonly PolicyRule[] = [
  { requirement: requirements[0], evaluate: applicability },
  {
    requirement: requirements[1],
    evaluate(action) {
      const id = requirements[1].id;
      if (!withinScope(action)) return result(id, "NOT_APPLICABLE", "SCOPE_NOT_ESTABLISHED", "Establish the modeled food/shipment scope before checking notice evidence.");
      const notice = action.product_facts?.prior_notice;
      const missing: string[] = [];
      if (!action.shipment?.id) missing.push("shipment.id");
      if (!notice?.confirmation_number) missing.push("product_facts.prior_notice.confirmation_number");
      if (!notice?.evidence_id) missing.push("product_facts.prior_notice.evidence_id");
      const evidence = action.evidence?.find((item) => item.id === notice?.evidence_id);
      if (!evidence) missing.push("evidence");
      if (missing.length) return result(id, "MISSING", "PRIOR_NOTICE_EVIDENCE_MISSING", "A matching prior-notice confirmation reference has not been supplied.", {
        missing_fields: missing, actions: [step(id, "collect_evidence", "Ask the importer or broker to arrange the applicable prior notice and supply the actual confirmation number, time, method, and product/shipment-matching record; then recheck.", missing, ["fda_prior_notice"])],
      });
      if (evidence!.type !== "fda_prior_notice" || evidence!.product.toLowerCase() !== action.product.toLowerCase()
        || evidence!.shipment_id !== action.shipment!.id) {
        return result(id, "REVIEW", "PRIOR_NOTICE_EVIDENCE_MISMATCH", "The referenced evidence type, product, or shipment does not match this proposed import.", {
          evidence_refs: [evidence!.id], actions: [step(id, "request_review", "Resolve the mismatched confirmation record and recheck using evidence for this product and shipment.")],
        });
      }
      return result(id, "SATISFIED", "PRIOR_NOTICE_REFERENCE_RECORDED", "A product/shipment-matching caller-supplied confirmation reference is recorded. Authenticity, filing contents, and FDA clearance are not established.", {
        evidence_refs: [evidence!.id],
      });
    },
  },
  {
    requirement: requirements[2],
    evaluate(action, now) {
      const id = requirements[2].id;
      if (!withinScope(action)) return result(id, "NOT_APPLICABLE", "SCOPE_NOT_ESTABLISHED", "Establish the modeled food/shipment scope before evaluating the filing window.");
      const notice = action.product_facts?.prior_notice;
      const missing: string[] = [];
      if (!notice?.confirmed_at) missing.push("product_facts.prior_notice.confirmed_at");
      if (!notice?.submission_method) missing.push("product_facts.prior_notice.submission_method");
      if (!action.shipment?.arrival_at) missing.push("shipment.arrival_at");
      if (!action.shipment?.arrival_timezone) missing.push("shipment.arrival_timezone");
      if (missing.length) return result(id, "MISSING", "PRIOR_NOTICE_TIMING_MISSING", "The filing window cannot be checked without confirmation, arrival, submission-method, and port-time-zone data.", {
        missing_fields: missing, actions: [step(id, "request_information", "Obtain the actual FDA confirmation time and method, first US port arrival time, and port time zone; then recheck.", missing)],
      });
      const confirmed = new Date(notice!.confirmed_at!).getTime();
      const arrival = new Date(action.shipment!.arrival_at!).getTime();
      if (confirmed > now.getTime() || arrival <= now.getTime()) return result(id, "REVIEW", "SHIPMENT_TIMESTAMPS_REQUIRE_REVIEW",
        "A confirmation is dated in the future or the proposed arrival is already past. Establish the actual pre-arrival facts.", {
          actions: [step(id, "request_review", "Resolve the shipment and confirmation timestamps using the actual records before rechecking.")],
        });
      const minimumHours = action.shipment!.transport_mode === "air" ? 4 : 8;
      const maximumDays = notice!.submission_method === "pnsi" ? 15 : 30;
      const hours = (arrival - confirmed) / 3600000;
      const days = calendarDay(action.shipment!.arrival_at!, action.shipment!.arrival_timezone!)
        - calendarDay(notice!.confirmed_at!, action.shipment!.arrival_timezone!);
      if (hours < minimumHours || days > maximumDays) return result(id, "FAILED", "PRIOR_NOTICE_OUTSIDE_FILING_WINDOW",
        "The supplied confirmation does not satisfy the modeled minimum lead time or maximum calendar-day window for this proposed arrival.", {
          actions: [step(id, "reschedule_or_refile", "Hold this proposed shipment. Have the importer or broker establish a lawful arrival/filing arrangement using actual records, then submit a fresh check.")],
        });
      return result(id, "SATISFIED", "PRIOR_NOTICE_WITHIN_FILING_WINDOW", "The supplied confirmation and arrival satisfy the modeled " + minimumHours + "-hour minimum and " + maximumDays + "-calendar-day maximum in the declared port time zone.");
    },
  },
];

import { MarketingContext, checkExpressConsent, checkMessageRequirements, permissionScope } from "./context.js";
import { addCalendarMonths } from "./context.js";
import { sources } from "./sources.js";

export function checkUS(ctx: MarketingContext) {
  const policy = "us-can-spam", source = sources.us.url;
  checkMessageRequirements(ctx, policy, "US");
  const review = ctx.input.evidence.content_review;
  if (ctx.checks.find((item) => item.kind === "content_review")?.status === "CURRENT" && review) {
    ctx.flag(policy, "subject", "Nondeceptive subject line", review.subject_accurate,
      "Review the subject against the actual offer and content, correct misleading wording, and recheck.", source, ["content_review"]);
    if (review.ad_identification_present === true) {
      ctx.flag(policy, "advertising", "Advertising identification", true, "Keep advertising identification clear.", source, ["content_review"]);
    } else {
      const consent = ctx.input.evidence.permission;
      const current = ctx.checks.find((item) => item.kind === "permission")?.status === "CURRENT";
      if (current && consent?.basis === "express_consent" && consent.covers_message === true && consent.withdrawn === false
        && consent.affirmative_action === true && consent.specific_and_informed === true
        && consent.granted_at && Date.parse(consent.granted_at) <= Date.parse(ctx.input.planned_send_at)
        && (!consent.expires_at || Date.parse(consent.expires_at) > Date.parse(ctx.input.planned_send_at))) {
        ctx.flag(policy, "advertising", "Affirmative-consent exception to advertising identification", true,
          "Retain the affirmative-consent record supporting this exception.", sources.usStatute.url, ["permission", "content_review"]);
      } else {
        ctx.add(policy, "advertising", "Advertising identification or supported exception", "MISSING",
          "Advertising identification is absent or unconfirmed and an affirmative-consent exception has not been established.",
          "Clearly identify the message as advertising, or supply affirmative-consent evidence supporting the identification exception. Recheck the revised message.", sources.usStatute.url, ["content_review", "permission"]);
      }
    }
  }
  ctx.add(policy, "prior_opt_in", "Prior opt-in under CAN-SPAM", "SATISFIED",
    "This CAN-SPAM pack does not impose a general prior opt-in requirement. Opt-outs and other applicable rules still apply.",
    "Keep suppression status current.", source);
}

export function checkCanada(ctx: MarketingContext) {
  const policy = "ca-casl", source = sources.ca.url;
  checkMessageRequirements(ctx, policy, "CA");
  const permission = permissionScope(ctx, policy, source);
  if (!permission) return;
  switch (permission.basis) {
    case "express_consent":
      checkExpressConsent(ctx, policy, source);
      break;
    case "implied_purchase":
    case "implied_inquiry": {
      const months = permission.basis === "implied_purchase" ? 24 : 6;
      const event = permission.qualifying_event_at;
      const expiry = event ? addCalendarMonths(event, months) : null;
      const send = Date.parse(ctx.input.planned_send_at);
      if (expiry && Math.abs(send - expiry.getTime()) < 86_400_000) {
        ctx.add(policy, "implied_consent_window", "Implied-consent date boundary", "REVIEW",
          "This send is within one day of the computed expiry. Calendar boundaries need the applicable local dates and legal interpretation.",
          "Confirm the original event date, send timezone and exact statutory window; otherwise use another supported basis or exclude the recipient.", source, ["permission"]);
        break;
      }
      ctx.flag(policy, "implied_consent_window", `Selected implied-consent route: ${months} calendar months`,
        event === undefined ? undefined : Date.parse(event) <= send && send < expiry!.getTime()
          && (!permission.expires_at || Date.parse(permission.expires_at) > send),
        expiry ? `This selected route expires ${expiry.toISOString()}. Retrieve another supported permission basis or exclude the recipient.`
          : "Retrieve the qualifying purchase or sales-inquiry event and date for this sender and recipient.", source, ["permission"]);
      break;
    }
    case "none":
      ctx.add(policy, "permission_basis", "Supported permission basis", permission.all_records_checked === true ? "FAILED" : "MISSING",
        permission.all_records_checked === true ? "The supplied completed record search reports no permission basis for this request." : "No supported permission basis is established; absence of an attached record is not proof of no consent.",
        "Retrieve an existing consent record or another supported basis; otherwise exclude the recipient. A consent-request email itself can be a commercial electronic message.", source, ["permission"]);
      break;
    default:
      ctx.add(policy, "permission_basis", "Review the claimed permission route", "REVIEW",
        `The claimed ${permission.basis} route is not implemented in this CASL MVP. Exemptions, non-business relationships and publication-based routes require separate review.`,
        "Have a reviewer establish the exact applicable provision and evidence, or supply a supported permission route.", source, ["permission"]);
  }
}

export function checkUK(ctx: MarketingContext) {
  const policy = "gb-pecr", source = sources.gb.url;
  checkMessageRequirements(ctx, policy, "GB");
  const subscriber = ctx.evidence("subscriber", policy, "subscriber_evidence", "Subscriber classification evidence", source);
  const type = ctx.input.recipient.subscriber_type;
  if (subscriber) ctx.add(policy, "subscriber_type", "Individual or corporate subscriber established",
    type !== "unknown" && subscriber.subscriber_type === type ? "SATISFIED" : "MISSING",
    type !== "unknown" && subscriber.subscriber_type === type ? "The supplied subscriber classification matches this recipient." : "Subscriber classification is unknown or conflicting.",
    "Establish the actual subscriber type. A business-looking email address does not prove corporate status; sole traders and some partnerships are individual subscribers.", source, ["subscriber"], "assessment_input");
  if (!subscriber || type === "unknown" || subscriber.subscriber_type !== type) return;
  if (type === "corporate") {
    ctx.add(policy, "corporate_permission", "Corporate subscriber consent rule", "SATISFIED",
      "PECR's individual-subscriber consent/soft-opt-in condition is not required for this evidenced corporate subscriber. Identification, opt-out and separate data-protection obligations remain.",
      "Keep the subscriber evidence and suppression records current.", source, ["subscriber"]);
    return;
  }
  const permission = permissionScope(ctx, policy, source);
  if (!permission) return;
  switch (permission.basis) {
    case "express_consent":
      checkExpressConsent(ctx, policy, source);
      break;
    case "solicited":
      ctx.flag(policy, "requested_message", "Recipient requested this particular message", permission.covers_message,
        "Retrieve the request for this particular message. A general customer relationship is insufficient.", source, ["permission"]);
      break;
    case "soft_opt_in": {
      for (const [key, title] of [["collected_directly", "Address collected directly"], ["during_sale_or_negotiation", "Collection during a sale or sales negotiation"],
        ["opt_out_at_collection", "Opt-out offered at collection"]] as const) {
        ctx.flag(policy, key, title, permission[key], "Retrieve the collection form/event proving this condition; establish another valid basis or exclude the recipient.", source, ["permission"]);
      }
      ctx.flag(policy, "collection_date", "Collection occurred before this message", permission.qualifying_event_at === undefined ? undefined
        : Date.parse(permission.qualifying_event_at) <= Date.parse(ctx.input.planned_send_at),
      "Retrieve the original collection event and date.", source, ["permission"]);
      const review = ctx.input.evidence.content_review;
      if (ctx.checks.find((item) => item.kind === "content_review")?.status === "CURRENT" && review) {
        ctx.flag(policy, "similar_products", "Marketing the sender's own similar products or services", review.own_similar_products,
          "Have a reviewer compare the proposed offer with the earlier purchase or sales negotiation. Otherwise establish another basis or exclude the recipient.", source, ["content_review", "permission"]);
      }
      break;
    }
    case "none":
      ctx.add(policy, "permission_basis", "Individual subscriber permission", permission.all_records_checked === true ? "FAILED" : "MISSING",
        "Consent, a qualifying commercial soft opt-in, or a request for this particular message has not been established.",
        "Retrieve an existing permission record or a fully evidenced commercial soft opt-in; otherwise exclude the recipient.", source, ["permission"]);
      break;
    default:
      ctx.add(policy, "permission_basis", "Review the claimed permission route", "REVIEW", `The ${permission.basis} route is not implemented for UK individual subscribers.`,
        "Establish consent or every applicable commercial soft-opt-in condition, or obtain separate review.", source, ["permission"]);
  }
}

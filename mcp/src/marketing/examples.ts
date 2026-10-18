import { messageFingerprint } from "./evidence.js";
import { addCalendarMonths } from "./context.js";
import type { MarketingAction, MarketingEvaluation } from "./schemas.js";

export interface MarketingExample { id: string; title: string; description: string; expected_decision: MarketingEvaluation["decision"]; input: MarketingAction }

export function marketingExamples(now = new Date()): MarketingExample[] {
  const observed = now.toISOString();
  const before = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const after = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
  function base(country: "US" | "CA" | "GB"): MarketingAction {
    const input: MarketingAction = {
      sender: { id: "example-store", name: "Example Store", country, postal_address: "123 Example Street, Example City", contact: "hello@example.com" },
      dispatch_country: country, recipient: { id: "synthetic-recipient-1", country, subscriber_type: "individual" },
      message: { subject: "Explore our new coffee collection", from_name: "Example Store", from_email: "hello@example.com", reply_to: "hello@example.com",
        text: "Advertisement from Example Store. Explore our new coffee collection.\n123 Example Street, Example City\nContact: hello@example.com\nUnsubscribe from all marketing: https://example.com/unsubscribe",
        kind: "commercial", purpose: "Coffee collection promotion", unsubscribe: { method: "url", target: "https://example.com/unsubscribe" } },
      planned_send_at: observed, evidence: {},
    };
    const shared = { reference: "synthetic-record", source: "Synthetic demo evidence; no real system was queried", observed_at: observed, status: "available" as const, sender_id: input.sender.id };
    const scoped = { ...shared, recipient_id: input.recipient.id };
    input.evidence = {
      sender_profile: { ...shared, reference: "demo-sender-profile", identity_confirmed: true, postal_address_confirmed: true, contact_confirmed: true, contact_valid_until: after(90) },
      content_review: { ...shared, reference: "demo-draft-review", reviewed_by: "Demo reviewer", headers_accurate: true, subject_accurate: true,
        ad_identification_present: true, sender_identification_present: true, opt_out_clear: true, own_similar_products: true },
      permission: { ...scoped, reference: "demo-consent-event", basis: "express_consent", channel: "email", covers_message: true, withdrawn: false, granted_at: before(365 * 3),
        collection_method: "Unticked checkbox selected on the sender's own signup form", consent_text: "I agree to receive coffee promotions by email from Example Store.",
        affirmative_action: true, specific_and_informed: true, freely_given: true },
      suppression: { ...scoped, reference: "demo-suppression-search", suppressed: false, all_sources_checked: true },
      unsubscribe: { ...shared, reference: "demo-unsubscribe-test", target: input.message.unsubscribe!.target, functional: true, simple: true, free: true,
        no_login_required: true, all_marketing_opt_out: true, available_until: after(90), max_processing_business_days: 1, processes_without_delay: true },
      subscriber: { ...scoped, reference: "demo-subscriber-record", subscriber_type: "individual" },
    };
    bind(input);
    return input;
  }
  function bind(input: MarketingAction) {
    const fingerprint = messageFingerprint(input.message);
    for (const kind of ["content_review", "permission", "unsubscribe"] as const) if (input.evidence[kind]) input.evidence[kind]!.message_sha256 = fingerprint;
  }
  const result: MarketingExample[] = [];
  function example(id: string, title: string, description: string, country: "US" | "CA" | "GB", expected: MarketingExample["expected_decision"], modify: (input: MarketingAction) => void = () => {}, rebind = true) {
    const input = base(country); modify(input); if (rebind) bind(input);
    result.push({ id, title, description, expected_decision: expected, input });
  }
  example("us-missing-footer", "US · Missing address and unsubscribe", "The rendered draft omits two required footer elements. The supplied sender profile supports a proposed address correction.", "US", "BLOCK", (i) => {
    i.message.text = "Advertisement from Example Store. Explore our new coffee collection. Contact: hello@example.com";
    delete i.message.unsubscribe; delete i.evidence.permission;
  });
  example("us-corrected", "US · Corrected email without prior opt-in", "The corrected draft includes the address and functioning opt-out evidence. CAN-SPAM does not impose general prior opt-in.", "US", "NO_BLOCKERS_FOUND", (i) => { delete i.evidence.permission; });
  example("ca-missing-consent", "Canada · Permission evidence missing", "An unattached consent record is an evidence gap; the tool asks for an existing supported basis.", "CA", "NEEDS_EVIDENCE", (i) => { delete i.evidence.permission; });
  example("ca-express-consent", "Canada · Existing express consent retrieved", "A three-year-old express consent event has no automatic expiry here; a fresh retrieval and current withdrawal/suppression evidence are supplied.", "CA", "NO_BLOCKERS_FOUND");
  example("gb-missing-collection-opt-out", "UK · Customer soft opt-in incomplete", "Being a customer is insufficient: the record omits the opt-out offered at collection.", "GB", "NEEDS_EVIDENCE", (i) => {
    Object.assign(i.evidence.permission!, { basis: "soft_opt_in", qualifying_event_at: before(100), collected_directly: true, during_sale_or_negotiation: true });
  });
  example("gb-soft-opt-in", "UK · Collection evidence retrieved", "Direct collection during a sale, the original opt-out, similar products and a working opt-out in this message are evidenced.", "GB", "NO_BLOCKERS_FOUND", (i) => {
    Object.assign(i.evidence.permission!, { basis: "soft_opt_in", qualifying_event_at: before(100), collected_directly: true, during_sale_or_negotiation: true, opt_out_at_collection: true });
  });
  example("ca-expired-inquiry", "Canada · Inquiry route expired", "An inquiry older than six calendar months does not support this selected implied-consent route.", "CA", "BLOCK", (i) => {
    Object.assign(i.evidence.permission!, { basis: "implied_inquiry", qualifying_event_at: addCalendarMonths(observed, -7).toISOString() });
  });
  example("ca-recent-purchase", "Canada · Recent purchase evidence", "A qualifying purchase within 24 calendar months supports the selected implied-consent route.", "CA", "NO_BLOCKERS_FOUND", (i) => {
    Object.assign(i.evidence.permission!, { basis: "implied_purchase", qualifying_event_at: addCalendarMonths(observed, -12).toISOString() });
  });
  example("gb-corporate", "UK · Corporate subscriber", "An evidenced corporate subscriber follows a different PECR consent rule, while identity and opt-out checks still apply.", "GB", "NO_BLOCKERS_FOUND", (i) => {
    i.recipient.subscriber_type = "corporate"; i.evidence.subscriber!.subscriber_type = "corporate"; delete i.evidence.permission;
  });
  example("gb-unknown-subscriber", "UK · Subscriber type unknown", "A company-looking contact is not automatically treated as a corporate subscriber.", "GB", "NEEDS_EVIDENCE", (i) => {
    i.recipient.subscriber_type = "unknown"; i.evidence.subscriber!.subscriber_type = "unknown";
  });
  example("withdrawn", "Canada · Permission withdrawn", "A recorded withdrawal holds the email even if a different record still claims consent.", "CA", "BLOCK", (i) => { i.evidence.permission!.withdrawn = true; });
  example("suppressed", "US · Recipient suppressed", "The application holds email to a recipient flagged by the supplied suppression search.", "US", "BLOCK", (i) => { i.evidence.suppression!.suppressed = true; });
  example("provider-unavailable", "US · Suppression source unavailable", "Unavailable source evidence remains unknown and cannot be interpreted as an empty suppression list.", "US", "NEEDS_EVIDENCE", (i) => { i.evidence.suppression!.status = "unavailable"; });
  example("stale-evidence", "US · Suppression evidence stale", "A two-hour-old search exceeds the application's 15-minute freshness threshold.", "US", "NEEDS_EVIDENCE", (i) => { i.evidence.suppression!.observed_at = new Date(now.getTime() - 7_200_000).toISOString(); });
  example("changed-draft", "US · Draft changed after review", "The content fingerprint changed; the prior content and operational evidence cannot silently cover the new draft.", "US", "NEEDS_EVIDENCE", (i) => { i.message.subject = "Explore our updated coffee collection"; }, false);
  example("cross-border", "US and Canada · Applicability review", "Both candidate packs run, while cross-border applicability and exceptions require review.", "CA", "REVIEW", (i) => { i.sender.country = "US"; i.dispatch_country = "US"; });
  example("unsupported-country", "France · Coverage gap", "Unsupported countries never produce a no-blockers result.", "US", "REVIEW", (i) => { i.sender.country = "FR"; i.dispatch_country = "FR"; i.recipient.country = "FR"; });
  example("charitable", "UK · Charitable message", "Charitable soft opt-in is outside this commercial-email MVP and remains an explicit review item.", "GB", "REVIEW", (i) => { i.message.kind = "charitable"; });
  return result;
}

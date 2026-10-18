import type { EvidenceKind, MarketingAction, MarketingEvaluation, MarketingRequirement } from "./schemas.js";
import { sources } from "./sources.js";

export const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export class MarketingContext {
  readonly findings: MarketingRequirement[] = [];
  readonly instructions = new Map<string, string>();
  constructor(readonly input: MarketingAction, readonly checks: MarketingEvaluation["evidence_checks"]) {}

  add(policy: string, id: string, title: string, status: MarketingRequirement["status"], detail: string,
    instruction: string, source: string | null = null, kinds: EvidenceKind[] = [], basis: MarketingRequirement["basis"] = "legal_readiness") {
    const key = `${policy}.${id}`;
    this.findings.push({ id: key, policy_id: policy, title, status, detail, basis, source_url: source,
      evidence_references: kinds.flatMap((kind) => this.input.evidence[kind]?.reference ? [this.input.evidence[kind]!.reference] : []) });
    this.instructions.set(key, instruction);
  }

  flag(policy: string, id: string, title: string, value: boolean | undefined, instruction: string,
    source: string | null, kinds: EvidenceKind[] = []) {
    this.add(policy, id, title, value === undefined ? "MISSING" : value ? "SATISFIED" : "FAILED",
      value === undefined ? "This fact is not established by the supplied evidence." : value ? "Supported by the supplied evidence for this assessment." : "The supplied evidence shows this condition is not met.", instruction, source, kinds,
      policy === "marketing-evidence" ? "application_policy" : "legal_readiness");
  }

  evidence<K extends EvidenceKind>(kind: K, policy: string, id: string, title: string, source: string | null): NonNullable<MarketingAction["evidence"][K]> | undefined {
    const check = this.checks.find((item) => item.kind === kind)!;
    if (check.status !== "CURRENT") {
      this.add(policy, id, title, "MISSING", check.detail, check.detail, source, [kind], "assessment_input");
      return undefined;
    }
    return this.input.evidence[kind] as NonNullable<MarketingAction["evidence"][K]>;
  }

  content(policy: string, source: string) {
    return this.evidence("content_review", policy, "content_review", "Review of this exact rendered message", source);
  }
}

export function addCalendarMonths(instant: string, months: number): Date {
  const result = new Date(instant);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function permissionScope(ctx: MarketingContext, policy: string, source: string) {
  const record = ctx.evidence("permission", policy, "permission_evidence", "Permission evidence for this sender, recipient and message", source);
  if (!record) return;
  ctx.flag(policy, "permission_scope", "Permission covers this message", record.covers_message, "Retrieve evidence covering this sender, email channel and proposed message, or exclude the recipient.", source, ["permission"]);
  ctx.flag(policy, "permission_withdrawal", "Permission has not been withdrawn", record.withdrawn === undefined ? undefined : !record.withdrawn,
    "Exclude this recipient while a withdrawal applies. A new permission basis needs a fresh check.", source, ["permission"]);
  return record;
}

export function checkExpressConsent(ctx: MarketingContext, policy: string, source: string) {
  const record = ctx.input.evidence.permission!;
  const send = Date.parse(ctx.input.planned_send_at);
  const valid = record.granted_at === undefined ? undefined : Date.parse(record.granted_at) <= send
    && (!record.expires_at || Date.parse(record.expires_at) > send);
  ctx.flag(policy, "express_consent_date", "Express consent at the planned send time", valid,
    "Retrieve the original consent event and any expiry terms. Do not invent or backdate consent.", source, ["permission"]);
  ctx.flag(policy, "affirmative_consent", "Affirmative consent action", record.affirmative_action,
    "Retrieve the original opt-in action and collection method; silence and inactivity do not establish express consent.", source, ["permission"]);
  ctx.flag(policy, "informed_consent", "Specific and informed consent", record.specific_and_informed,
    "Review the original consent wording, sender identification, channel and purpose scope.", source, ["permission"]);
  if (policy === "gb-pecr") ctx.flag(policy, "freely_given_consent", "Freely given consent", record.freely_given,
    "Review whether the person could refuse freely and whether consent was separate from unrelated terms.", source, ["permission"]);
}

export function checkMessageRequirements(ctx: MarketingContext, policy: string, country: "US" | "CA" | "GB") {
  const source = country === "US" ? sources.us.url : country === "CA" ? sources.caMessages.url : sources.gb.url;
  const { sender, message, planned_send_at } = ctx.input;
  const profile = ctx.evidence("sender_profile", policy, "sender_profile", "Sender identity evidence", source);
  const review = ctx.content(policy, source);
  if (profile) ctx.flag(policy, "sender_identity", "Sender identity confirmed", profile.identity_confirmed,
    "Confirm the sender against the organization's records and correct the From and Reply-To details.", source, ["sender_profile"]);
  if (review) {
    ctx.add(policy, "reviewer", "Content review attribution", review.reviewed_by ? "SATISFIED" : "MISSING",
      review.reviewed_by ? "The supplied content review identifies its reviewer or system." : "The reviewer or reviewing system is not recorded.",
      "Identify the reviewer or system responsible for the supplied content judgments.", null, ["content_review"], "assessment_input");
    ctx.flag(policy, "headers", "Accurate sender and routing information", review.headers_accurate,
      "Correct the sender/header information and review the revised message.", source, ["content_review"]);
    ctx.flag(policy, "identification", "Sender identification in the message", review.sender_identification_present,
      "Add the required sender identification and review the revised message.", source, ["content_review"]);
  }
  if (country !== "GB") {
    const address = sender.postal_address;
    ctx.flag(policy, "postal_address", "Sender postal address in the rendered message", address ? normalize(message.text).includes(normalize(address)) : undefined,
      address ? `Insert the sender's confirmed postal address: ${address}. Then recheck the revised draft.` : "Retrieve the sender's verified postal address before proposing a footer.", source);
    if (profile) ctx.flag(policy, "postal_address_evidence", "Postal address confirmed in sender records", profile.postal_address_confirmed,
      "Confirm the supplied postal address with the organization's records.", source, ["sender_profile"]);
  }
  if (country === "CA") {
    ctx.flag(policy, "contact_details", "Sender contact details in the message", sender.contact ? normalize(message.text).includes(normalize(sender.contact)) : undefined,
      "Include the sender's confirmed telephone, email or web contact details.", source);
    if (profile) {
      ctx.flag(policy, "contact_confirmed", "Sender contact details confirmed", profile.contact_confirmed, "Verify the sender's contact details.", source, ["sender_profile"]);
      ctx.flag(policy, "contact_validity", "Contact information remains valid for 60 days", profile.contact_valid_until === undefined ? undefined
        : Date.parse(profile.contact_valid_until) >= Date.parse(planned_send_at) + 60 * 86_400_000,
      "Confirm that the sender's contact information will remain valid for at least 60 days after sending.", source, ["sender_profile"]);
    }
  }
  const mechanism = message.unsubscribe;
  if (!mechanism) {
    ctx.flag(policy, "unsubscribe_present", "Opt-out mechanism in the rendered message", false,
      "Add a functioning opt-out mechanism from the email platform or monitored reply address, then recheck.", source);
    return;
  }
  const targetValid = mechanism.method === "url" ? /^https?:\/\/[^\s]+$/i.test(mechanism.target)
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mechanism.target);
  const targetPresent = message.text.includes(mechanism.target) || !!message.html?.includes(mechanism.target);
  ctx.flag(policy, "unsubscribe_present", "Opt-out target present and correctly formed", targetValid && targetPresent,
    "Include the actual configured opt-out URL or reply address in the rendered message.", source);
  if (review) ctx.flag(policy, "opt_out_clear", "Clear opt-out instructions", review.opt_out_clear,
    "Make the opt-out instructions clear and prominent, then review this exact revised draft.", source, ["content_review"]);
  const operational = ctx.evidence("unsubscribe", policy, "unsubscribe_evidence", "Unsubscribe operational evidence", source);
  if (!operational) return;
  ctx.flag(policy, "unsubscribe_target", "Operational evidence matches this opt-out target", operational.target === undefined ? undefined : operational.target === mechanism.target,
    "Retrieve configuration or a controlled synthetic-recipient test for this exact opt-out target. Do not activate a real recipient's unsubscribe link.", source, ["unsubscribe"]);
  for (const [key, title] of [["functional", "Functioning opt-out"], ["simple", "Simple opt-out process"], ["free", "No opt-out fee"],
    ["no_login_required", "No login required to opt out"]] as const) {
    ctx.flag(policy, key, title, operational[key], "Repair or demonstrate the opt-out process using a controlled test, then recheck.", source, ["unsubscribe"]);
  }
  if (country === "US") ctx.flag(policy, "all_marketing_opt_out", "Option to stop all marketing email", operational.all_marketing_opt_out,
    "Provide an option to stop all marketing email from this sender.", source, ["unsubscribe"]);
  if (country !== "GB") {
    const days = country === "CA" ? 60 : 30;
    ctx.flag(policy, "unsubscribe_validity", `Opt-out mechanism available for at least ${days} days`, operational.available_until === undefined ? undefined
      : Date.parse(operational.available_until) >= Date.parse(planned_send_at) + days * 86_400_000,
    `Confirm the configured opt-out mechanism remains available for at least ${days} days after sending.`, source, ["unsubscribe"]);
    ctx.flag(policy, "processing_deadline", "Opt-out processing within 10 business days", operational.max_processing_business_days === undefined ? undefined : operational.max_processing_business_days <= 10,
      "Configure and evidence opt-out processing within 10 business days.", source, ["unsubscribe"]);
  }
  if (country !== "US") ctx.flag(policy, "without_delay", "Opt-outs processed without delay", operational.processes_without_delay,
    "Process opt-outs without delay and refresh suppression records before sending.", source, ["unsubscribe"]);
}

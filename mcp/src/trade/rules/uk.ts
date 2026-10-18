import type { Category, LegalSource, TradeRule } from "../types.js";

const source = (title: string, url: string): LegalSource => ({
  title, url, verified_as_of: "2026-10-17", verification_status: "verified_guidance",
});
const strategicControls = source("UK strategic export controls",
  "https://www.gov.uk/guidance/uk-strategic-export-controls");
const territorialControls = source("UK dual-use controls: Great Britain and Northern Ireland",
  "https://www.gov.uk/guidance/export-controls-dual-use-items-software-and-technology-goods-for-torture-and-radioactive-sources");
const technology = source("UK exporting military or dual-use technology: definitions and scope",
  "https://www.gov.uk/government/publications/exporting-military-or-dual-use-technology-definitions/export-of-technology-remote-access-and-the-use-of-cloud-computing-services");
const endUse = source("UK military end-use controls and WMD review",
  "https://www.gov.uk/guidance/military-end-use-controls");
const ogel = source("UK open general export licences: conditions and registration",
  "https://www.gov.uk/government/collections/open-general-export-licences-ogels");
const sanctions = source("UK countering Russian sanctions evasion guidance",
  "https://www.gov.uk/government/publications/countering-russian-sanctions-evasion-and-circumvention/countering-russian-sanctions-evasion-guidance-for-exporters");
const base = { version: "1.0.0", jurisdiction: "GB", direction: "export" } as const;
const strategic: readonly Category[] = ["dual_use", "advanced_computing", "encryption", "military", "nuclear", "chemicals"];

export const ukRules: readonly TradeRule[] = [
  {
    ...base, id: "GB-NORTHERN-IRELAND-REVIEW", title: "Northern Ireland territorial rules review", categories: strategic,
    conditions: { field: "technical_specifications.uk_export_region", op: "eq", value: "northern_ireland" },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"], finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Northern Ireland dual-use arrangements require a separate territorial assessment. This Great Britain scenario pack does not determine Northern Ireland licensing obligations.",
    required_documents: ["northern_ireland_export_control_assessment"],
    remediation_steps: [{ owner: "human", instruction: "Confirm the current Northern Ireland rules and relevant authority before relying on an authorization." }],
    sources: [territorialControls],
  },
  {
    ...base, id: "GB-EXPORT-CLASSIFICATION", title: "Establish the UK strategic control entry", categories: strategic,
    conditions: { any: [
      { not: { field: "control_classification", op: "exists" } },
      { not: { field: "classification_evidence", op: "exists" } },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "technical_specifications.uk_export_region"],
    finding: "CLASSIFICATION_REQUIRED",
    explanation: "Match specifications to current UK control lists. Confirm Great Britain versus Northern Ireland, where dual-use rules differ; a scenario label is not a control entry.",
    required_documents: ["uk_classification_assessment"],
    remediation_steps: [{ owner: "human", instruction: "Review the consolidated list and retain classification evidence, using ECJU advice where needed." }],
    sources: [strategicControls, territorialControls],
  },
  {
    ...base, id: "GB-CONTROLLED-ITEM-EXPORT", title: "Great Britain controlled item authorization", categories: strategic,
    transaction_types: ["shipment", "reexport"],
    conditions: { all: [
      { field: "technical_specifications.uk_strategic_listed", op: "eq", value: true },
      { field: "technical_specifications.uk_export_region", op: "eq", value: "great_britain" },
      { not: { field: "to_country", op: "eq", value: "GB" } },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"], finding: "LICENSE_REQUIRED",
    explanation: "The caller identifies a strategically controlled export from Great Britain. Validate the entry, territorial scope and applicable licence; supplied licences remain unverified.",
    required_documents: ["uk_export_licence"],
    remediation_steps: [{ owner: "human", instruction: "Validate classification and obtain or verify the correct ECJU licence before export." }],
    sources: [strategicControls],
  },
  {
    ...base, id: "GB-TECHNOLOGY-TRANSFER", title: "Controlled technology access overseas",
    transaction_types: ["technology_transfer"],
    conditions: { all: [
      { field: "technical_specifications.uk_controlled_technology", op: "eq", value: true },
      { field: "technical_specifications.uk_export_region", op: "eq", value: "great_britain" },
      { not: { field: "to_country", op: "eq", value: "GB" } },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"], finding: "LICENSE_REQUIRED",
    explanation: "Caller-identified controlled technology is made available from Great Britain to an overseas recipient. Recipient location matters, including cloud or remote access; verify exclusions and existing licence coverage.",
    required_documents: ["uk_technology_export_licence", "technology_recipient_access_record"],
    remediation_steps: [
      { owner: "agent", instruction: "Record the actual locations of all intended recipients and the technology accessible to each." },
      { owner: "human", instruction: "Validate control status, exemptions and licence scope before enabling overseas access." },
    ], sources: [technology],
  },
  {
    ...base, id: "GB-END-USE-REVIEW", title: "Military and WMD catch-all review",
    conditions: { any: [
      { field: "end_use_flags", op: "contains", value: "military" },
      { field: "end_use_flags", op: "contains", value: "wmd" },
      { field: "technical_specifications.ecju_end_use_notification", op: "eq", value: true },
    ] },
    required_inputs: ["end_user", "end_use", "technical_specifications.uk_export_region"], finding: "END_USE_REVIEW",
    explanation: "Review non-listed as well as listed items where end-use concerns exist. Broad risk flags do not alone establish a prohibition; awareness, official notification and the specific statutory conditions matter.",
    required_documents: ["uk_end_use_assessment"],
    remediation_steps: [{ owner: "human", instruction: "Contact ECJU about relevant military or WMD concerns; retain any notification and determine licensing and notification obligations." }],
    sources: [endUse],
  },
  {
    ...base, id: "GB-OGEL-CANDIDATE", title: "Consider an open general export licence", categories: strategic,
    conditions: { all: [
      { field: "technical_specifications.uk_strategic_listed", op: "eq", value: true },
      { field: "technical_specifications.ogel_candidate", op: "eq", value: true },
      { field: "technical_specifications.uk_export_region", op: "eq", value: "great_britain" },
    ] },
    required_inputs: ["control_classification", "classification_evidence", "end_user", "end_use"], finding: "GENERAL_AUTHORIZATION_POSSIBLE",
    explanation: "A caller-proposed OGEL needs item, destination, end-use and current terms checks. A category, eligibility assertion or registration reference alone does not authorize export.",
    required_documents: ["uk_ogel_eligibility_assessment", "uk_ogel_registration"],
    remediation_steps: [{ owner: "human", instruction: "Identify the current licence, verify every condition and registration requirement, and record shipping and reporting obligations; use an individual licence if ineligible." }],
    sources: [ogel],
  },
  {
    ...base, id: "GB-SANCTIONS-DIVERSION-REVIEW", title: "UK sanctions and diversion due diligence",
    conditions: { any: [
      { field: "to_country", op: "eq", value: "RU" },
      { field: "end_use_flags", op: "contains", value: "diversion" },
    ] },
    required_inputs: ["hs_code", "end_user", "end_use"], finding: "HUMAN_REVIEW_REQUIRED",
    explanation: "Russia routes and stated diversion risk trigger this limited scenario review. They are not automatic bans or a complete regime list. U.S. CSL screening does not cover UK sanctions, ownership or trade restrictions.",
    required_documents: ["uk_sanctions_due_diligence"],
    remediation_steps: [{ owner: "human", instruction: "Check current UK measures, counterparties and ownership, item restrictions and ultimate use, including indirect Russia exposure and authorization conditions." }],
    sources: [sanctions],
  },
];

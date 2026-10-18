import type { TradeExample } from "./index.js";

// Fresh synthetic records: no example is a real approval, confirmation, or classification.
const now = Date.now();
const hour = (offset: number) => new Date(now + offset * 3600000).toISOString();
const midnight = new Date(now).setUTCHours(0, 0, 0, 0);
const day = (offset: number, hours: number) => new Date(midnight + offset * 86400000 + hours * 3600000).toISOString();
const product = "DEMO packaged roasted coffee";
const coffee = {
  product, product_category: "food_agriculture" as const, from_country: "BR", to_country: "US", origin_country: "BR",
  hs_code: "090121", quantity: 100, value: 1200, currency: "USD", end_use_flags: [] as [],
  classification_evidence: "DEMO manufacturer classification; unverified",
  technical_specifications: { food_type: "packaged_roasted_coffee", manufacturer: "DEMO roaster", intended_food_use: "Retail human consumption", plant_material: false },
  end_user: "Example Coffee 9F21 Ltd", end_use: "Retail sale",
  parties: [{ name: "Example Coffee 9F21 Ltd", role: "importer" as const, country: "US" }],
  ownership: { blocked_ownership_percent: 0, evidence: "DEMO ownership record" },
  shipment: { id: "DEMO-COFFEE-01", purpose: "commercial_sale" as const, transport_mode: "air" as const, arrival_at: hour(24), arrival_timezone: "America/New_York" },
  documents: ["classification_record", "commercial_invoice", "customs_classification_record", "food_import_applicability_record"].map(type => ({ type, reference: `DEMO ${type}; unverified` })),
};
const confirmation = { confirmation_number: "DEMO-NOT-A-REAL-CONFIRMATION", confirmed_at: hour(-1), submission_method: "pnsi" as const, evidence_reference: "DEMO notice record" };
const noticeDocument = { type: "fda_prior_notice_confirmation", reference: confirmation.evidence_reference, product, shipment_id: coffee.shipment.id };
const confirmedCoffee = { ...coffee, prior_notice: confirmation, documents: [...coffee.documents, noticeDocument] };

export const regulatoryExamples: readonly TradeExample[] = [
  { id: "sg-ordinary-gum", title: "Ordinary chewing gum import is blocked", input: {
    product: "DEMO ordinary chewing gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "ordinary", hsa_approval_claimed: false },
  } },
  { id: "sg-gum-type-missing", title: "Gum type must be established before an import decision", input: {
    product: "DEMO unspecified gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
  } },
  { id: "sg-gum-approval-missing", title: "Dental gum exception needs a product-bound HSA record", input: {
    product: "DEMO dental gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "oral_dental", hsa_approval_claimed: true },
  } },
  { id: "sg-gum-approval-review", title: "Supplied HSA approval still requires human review", input: {
    product: "DEMO dental gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "oral_dental", hsa_approval_claimed: true },
    documents: [{ type: "hsa_approval", reference: "DEMO approval; not real", product: "DEMO dental gum" }],
  } },
  { id: "sg-gum-conflicting-claims", title: "Ordinary-gum and HSA-approval claims conflict", input: {
    product: "DEMO ordinary chewing gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "ordinary", hsa_approval_claimed: true },
  } },
  { id: "sg-gum-wrong-product", title: "Another product's HSA approval cannot establish an exclusion", input: {
    product: "DEMO dental gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "oral_dental", hsa_approval_claimed: true },
    documents: [{ type: "hsa_approval", reference: "DEMO other-product record", product: "Different demo product" }],
  } },
  { id: "sg-gum-negative-approval-conflict", title: "An HSA record conflicts with a negative approval claim", input: {
    product: "DEMO dental gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "oral_dental", hsa_approval_claimed: false },
    documents: [{ type: "hsa_approval", reference: "DEMO contradictory approval record", product: "DEMO dental gum" }],
  } },
  { id: "sg-gum-expired-approval", title: "Expired HSA approval needs replacement", input: {
    product: "DEMO medicinal gum", product_category: "chewing_gum", from_country: "MY", to_country: "SG",
    technical_specifications: { gum_type: "medicinal", hsa_approval_claimed: true },
    documents: [{ type: "hsa_approval", reference: "DEMO expired record", product: "DEMO medicinal gum", expires_on: "2025-01-01" }],
  } },
  { id: "sg-category-controls-scope", title: "A product name alone does not activate a gum prohibition", input: {
    product: "DEMO chewing gum display stand", product_category: "general_goods", from_country: "MY", to_country: "SG",
  } },
  { id: "india-nicotine-free-vape", title: "Nicotine-free electronic cigarette import is blocked", input: {
    product: "DEMO nicotine-free vaping device", product_category: "electronic_cigarette", from_country: "CN", to_country: "IN",
    technical_specifications: { licensed_medicine_claimed: false, contains_nicotine: false },
  } },
  { id: "india-vape-exclusion-unknown", title: "Unknown medicinal exclusion requests product facts", input: {
    product: "DEMO inhalation device", product_category: "electronic_cigarette", from_country: "CN", to_country: "IN",
  } },
  { id: "india-vape-licence-missing", title: "Medicinal-product claim needs a product-specific licence", input: {
    product: "DEMO inhalation device", product_category: "electronic_cigarette", from_country: "CN", to_country: "IN",
    technical_specifications: { licensed_medicine_claimed: true },
  } },
  { id: "india-vape-licence-review", title: "Supplied medicinal licence requires exclusion review", input: {
    product: "DEMO inhalation device", product_category: "electronic_cigarette", from_country: "CN", to_country: "IN",
    technical_specifications: { licensed_medicine_claimed: true },
    documents: [{ type: "medicinal_licence", reference: "DEMO licence; not real", product: "DEMO inhalation device" }],
  } },
  { id: "india-vape-licence-conflict", title: "Licence record conflicts with a negative exclusion claim", input: {
    product: "DEMO vaping device", product_category: "electronic_cigarette", from_country: "CN", to_country: "IN",
    technical_specifications: { licensed_medicine_claimed: false },
    documents: [{ type: "medicinal_licence", reference: "DEMO contradictory record", product: "DEMO vaping device" }],
  } },
  { id: "coffee-context-missing", title: "Coffee filing checks wait for shipment context", input: { ...coffee, shipment: undefined } },
  { id: "coffee-road-outside-scope", title: "Road shipment needs a separate FDA applicability review", input: { ...coffee, shipment: { ...coffee.shipment, transport_mode: "road" } } },
  { id: "coffee-notice-missing", title: "Commercial coffee shipment needs a matching prior notice", input: coffee },
  { id: "coffee-evidence-binding-missing", title: "A notice without shipment binding stays unresolved", input: {
    ...confirmedCoffee, documents: [...coffee.documents, { ...noticeDocument, shipment_id: undefined }],
  } },
  { id: "coffee-evidence-mismatch", title: "Another shipment's notice requires conflict review", input: {
    ...confirmedCoffee, documents: [...coffee.documents, { ...noticeDocument, shipment_id: "DEMO-DIFFERENT-SHIPMENT" }],
  } },
  { id: "coffee-evidence-rechecked", title: "Matching notice evidence satisfies scoped checks and retains review", input: confirmedCoffee },
  { id: "coffee-air-four-hour-boundary", title: "Air arrival at the four-hour minimum satisfies timing", input: {
    ...confirmedCoffee, shipment: { ...coffee.shipment, arrival_at: hour(3) },
  } },
  { id: "coffee-air-too-late", title: "Three-hour air notice fails the filing window", input: {
    ...confirmedCoffee, shipment: { ...coffee.shipment, arrival_at: hour(2) },
  } },
  { id: "coffee-sea-eight-hour-boundary", title: "Sea arrival at the eight-hour minimum satisfies timing", input: {
    ...confirmedCoffee, shipment: { ...coffee.shipment, transport_mode: "sea", arrival_at: hour(7) },
  } },
  { id: "coffee-sea-too-late", title: "Seven-hour sea notice fails the filing window", input: {
    ...confirmedCoffee, shipment: { ...coffee.shipment, transport_mode: "sea", arrival_at: hour(6) },
  } },
  { id: "coffee-pnsi-fifteen-calendar-days", title: "PNSI allows fifteen calendar days, including a partial last day", input: {
    ...confirmedCoffee, prior_notice: { ...confirmation, confirmed_at: day(-2, 0.5) },
    shipment: { ...coffee.shipment, arrival_at: day(13, 23.5), arrival_timezone: "UTC" },
  } },
  { id: "coffee-pnsi-sixteen-calendar-days", title: "PNSI notice sixteen calendar days before arrival fails", input: {
    ...confirmedCoffee, prior_notice: { ...confirmation, confirmed_at: day(-2, 23.5) },
    shipment: { ...coffee.shipment, arrival_at: day(14, 0.5), arrival_timezone: "UTC" },
  } },
  { id: "coffee-ace-thirty-calendar-days", title: "ABI/ACE allows thirty calendar days", input: {
    ...confirmedCoffee, prior_notice: { ...confirmation, confirmed_at: day(-2, 0.5), submission_method: "abi_ace" },
    shipment: { ...coffee.shipment, arrival_at: day(28, 23.5), arrival_timezone: "UTC" },
  } },
  { id: "coffee-port-timezone", title: "The first U.S. port time zone determines calendar-day boundaries", input: {
    ...confirmedCoffee, prior_notice: { ...confirmation, confirmed_at: day(-2, 3.5) },
    shipment: { ...coffee.shipment, arrival_at: day(13, 4.5), arrival_timezone: "America/New_York" },
  } },
  { id: "coffee-future-confirmation", title: "Future-dated confirmation requires record review", input: {
    ...confirmedCoffee, prior_notice: { ...confirmation, confirmed_at: hour(1) },
  } },
  { id: "coffee-past-arrival", title: "An already-past arrival cannot use the pre-arrival workflow", input: {
    ...confirmedCoffee, shipment: { ...coffee.shipment, arrival_at: hour(-0.5) },
  } },
];

import type { z } from "zod";
import type { tradeInputSchema } from "../schemas.js";

type Example = {
  id: string;
  title: string;
  input: z.input<typeof tradeInputSchema>;
};

/** Synthetic demo inputs and evidence references; no fixture represents an actual classification or authorization. */
export const otherExamples: readonly Example[] = [
  {
    id: "cn-rare-earth-classification", title: "Rare-earth magnet: establish Chinese list scope",
    input: {
      product: "DEMO samarium-cobalt magnet", product_category: "rare_earth", from_country: "CN", to_country: "DE",
      technical_specifications: { composition: "Samarium-cobalt; manufacturer composition report required", material_form: "Finished permanent magnet" },
      end_user: "DEMO industrial motor maker", end_use: "Commercial motors",
    },
  },
  {
    id: "cn-confirmed-listed-rare-earth", title: "Asserted listed magnet: obtain and verify authorization",
    input: {
      product: "DEMO listed samarium-cobalt magnet", product_category: "rare_earth", from_country: "CN", to_country: "DE",
      control_classification: "1C902.a.4", classification_evidence: "DEMO ONLY: reviewer asserts the applicable listed entry; verify before reliance",
      technical_specifications: { composition: "Samarium-cobalt", material_form: "Permanent magnet", cn_rare_earth_listed: true },
      end_user: "DEMO industrial motor maker", end_use: "Commercial motors",
    },
  },
  {
    id: "cn-dual-use-review", title: "Chinese machine tool: review national technical control scope",
    input: {
      product: "DEMO precision machine tool", product_category: "dual_use", from_country: "CN", to_country: "CA",
      technical_specifications: { performance: "Manufacturer accuracy and axis specification not yet supplied" },
      end_user: "DEMO civil manufacturer", end_use: "Industrial machining",
    },
  },
  {
    id: "india-scomet-review", title: "Indian chemical export: determine SCOMET entry",
    input: {
      product: "DEMO specialty chemical", product_category: "chemicals", from_country: "IN", to_country: "CA",
      technical_specifications: { performance: "CAS, composition and concentration evidence needed" },
      end_user: "DEMO chemical plant", end_use: "Industrial synthesis",
    },
  },
  {
    id: "india-import-code-policy", title: "Indian import: exact ITC(HS) policy lookup needed",
    input: {
      product: "DEMO industrial pump", product_category: "general_goods", from_country: "DE", to_country: "IN", origin_country: "DE",
      hs_code: "841370", technical_specifications: { india_itc_hs_code: "84137010" },
    },
  },
  {
    id: "india-confirmed-restricted-import", title: "Confirmed authorization route: DGFT document review",
    input: {
      product: "DEMO item with supplied restricted import policy evidence", product_category: "general_goods",
      from_country: "DE", to_country: "IN", origin_country: "DE", hs_code: "841370",
      classification_evidence: "DEMO ONLY: qualified reviewer classification attachment",
      technical_specifications: {
        india_itc_hs_code: "84137010", india_import_policy: "restricted_authorization",
        india_policy_evidence: "DEMO ONLY: synthetic policy assertion to exercise authorization branch; not the actual policy for this illustrative code",
      },
    },
  },
  {
    id: "canada-food-import", title: "Canadian food import: determine license and commodity requirements",
    input: {
      product: "DEMO packaged roasted coffee", product_category: "food_agriculture", from_country: "BR", to_country: "CA", origin_country: "BR",
      technical_specifications: { food_commodity: "Coffee", processing: "Roasted and packaged", intended_use: "Human consumption for retail sale", importer_business_activity: "Commercial food import and distribution" },
    },
  },
  {
    id: "canada-controlled-export", title: "Canadian sensor export: classify under current ECL",
    input: {
      product: "DEMO optical sensor", product_category: "dual_use", from_country: "CA", to_country: "DE",
      technical_specifications: { performance: "Spectral and sensitivity specifications pending" },
      end_user: "DEMO research laboratory", end_use: "Materials analysis",
    },
  },
  {
    id: "australia-biosecurity-review", title: "Australian seed import: find precise BICON case",
    input: {
      product: "DEMO wheat seeds for laboratory research", product_category: "food_agriculture", from_country: "DE", to_country: "AU", origin_country: "DE",
      technical_specifications: { commodity: "Triticum aestivum seeds", processing: "Untreated research material", intended_use: "Contained laboratory research" },
    },
  },
  {
    id: "australia-confirmed-bicon-permit", title: "Supplied BICON permit requirement: obtain grant before arrival",
    input: {
      product: "DEMO biological research material", product_category: "food_agriculture", from_country: "DE", to_country: "AU", origin_country: "DE",
      technical_specifications: {
        commodity: "Biological research material", processing: "As described in synthetic case", intended_use: "Contained research",
        bicon_case_reference: "DEMO ONLY: synthetic case requiring permit; select a real matching BICON case before reliance", bicon_permit_required: true,
      },
    },
  },
  {
    id: "australia-controlled-export", title: "Australian component: determine DSGL and exemption scope",
    input: {
      product: "DEMO aerospace navigation component", product_category: "dual_use", from_country: "AU", to_country: "GB",
      technical_specifications: { performance: "Navigation accuracy specification pending" }, end_user: "DEMO civil aircraft supplier", end_use: "Civil aircraft integration",
    },
  },
  {
    id: "japan-strategic-export", title: "Japanese sensor export: review list classification",
    input: {
      product: "DEMO infrared detector", product_category: "dual_use", from_country: "JP", to_country: "CA",
      technical_specifications: { performance: "Detector specifications pending" }, end_user: "DEMO research laboratory", end_use: "Scientific observation",
    },
  },
  {
    id: "japan-technology-transfer", title: "Japanese research-file transfer: examine technology content and recipient",
    input: {
      product: "DEMO laboratory process instructions", product_category: "general_goods", from_country: "JP", to_country: "DE", transaction_type: "technology_transfer",
      technical_specifications: { technology_content: "Process instructions requiring scope review", recipient_status: "Foreign research institute; details require verification" },
      end_user: "DEMO research institute", end_use: "Joint research",
    },
  },
  {
    id: "korea-strategic-export", title: "Korean equipment export: determine strategic-item status",
    input: {
      product: "DEMO precision production equipment", product_category: "dual_use", from_country: "KR", to_country: "DE",
      technical_specifications: { performance: "Precision and throughput specifications pending" }, end_user: "DEMO civil manufacturer", end_use: "Industrial manufacturing",
    },
  },
  {
    id: "korea-sensitive-end-use", title: "Korean general equipment: review declared nuclear end use",
    input: {
      product: "DEMO industrial control equipment", product_category: "general_goods", from_country: "KR", to_country: "DE", end_use_flags: ["nuclear"],
      technical_specifications: { performance: "Equipment performance sheet pending" }, end_user: "DEMO civilian energy research facility", end_use: "Civil nuclear research; exact activity to verify",
    },
  },
  {
    id: "cn-rare-earth-missing-evidence", title: "Missing rare-earth evidence asks for inputs without assuming licensing",
    input: { product: "DEMO unspecified rare-earth item", product_category: "rare_earth", from_country: "CN", to_country: "DE" },

  },
  {
    id: "cn-rare-earth-false-list-assertion", title: "Explicit unlisted assertion does not trigger confirmed-list authorization",
    input: {
      product: "DEMO rare-earth sample", product_category: "rare_earth", from_country: "CN", to_country: "DE",
      control_classification: "DEMO reviewed as outside supplied entry", classification_evidence: "DEMO ONLY: synthetic reviewer attachment",
      technical_specifications: { cn_rare_earth_listed: false, composition: "Composition requires independent validation", material_form: "Sample" },
    },
  },
  {
    id: "country-pack-nearby-nonmatch", title: "Ordinary Japanese furniture does not match strategic-item rules",
    input: { product: "DEMO metal office chair", product_category: "general_goods", from_country: "JP", to_country: "DE" },
  },
];

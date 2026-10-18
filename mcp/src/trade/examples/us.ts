import type { z } from "zod";
import type { tradeInputSchema } from "../schemas.js";

type Example = {
  id: string;
  title: string;
  input: z.input<typeof tradeInputSchema>;
};

const importBase = {
  from_country: "CA", to_country: "US", origin_country: "CA", end_use_flags: [],
  quantity: 10, value: 2500, currency: "USD", hs_code: "940360",
} satisfies Partial<z.input<typeof tradeInputSchema>>;
const exportBase = {
  from_country: "US", to_country: "CA", origin_country: "US", end_use_flags: [],
  quantity: 2, value: 5000, currency: "USD", end_user: "Demo Canadian laboratory",
  end_use: "Civil laboratory research", classification_evidence: "Demo manufacturer classification record; human verification required",
} satisfies Partial<z.input<typeof tradeInputSchema>>;

// Fictional demo requests; classification statements are unverified.
export const usExamples: readonly Example[] = [
  {
    id: "us-ordinary-import", title: "Canadian furniture import needs customs evidence",
    input: { ...importBase, product: "Wooden office tables", product_category: "general_goods" },


  },
  {
    id: "us-food-import", title: "Packaged food requires FDA applicability review",
    input: { ...importBase, product: "Packaged oat biscuits", product_category: "food_agriculture", hs_code: "190531",
      technical_specifications: { food_type: "Baked biscuits", manufacturer: "Demo Canadian bakery", intended_food_use: "Retail human consumption", plant_material: false } },

  },
  {
    id: "us-plant-import", title: "Fresh plant commodity needs exact APHIS lookup",
    input: { ...importBase, product: "Fresh apples", product_category: "food_agriculture", hs_code: "080810",
      technical_specifications: { food_type: "Fresh fruit", manufacturer: "Demo orchard", intended_food_use: "Retail human consumption", plant_material: true,
        botanical_name: "Malus domestica", plant_part: "Fruit", processing: "Fresh, untreated" } },

  },
  {
    id: "us-medical-import", title: "Medical device jurisdiction and registration review",
    input: { ...importBase, product: "Diagnostic ultrasound system", product_category: "medical", hs_code: "901812",
      technical_specifications: { medical_product_type: "Diagnostic medical device", intended_medical_use: "Clinical diagnostic imaging", manufacturer: "Demo Canadian medical systems" } },

  },
  {
    id: "us-chemical-import", title: "Chemical mixture needs TSCA assessment",
    input: { ...importBase, product: "Industrial cleaning mixture", product_category: "chemicals", hs_code: "340290", end_use: "Industrial equipment cleaning",
      technical_specifications: { chemical_identity: "Demo supplier SDS identifies all constituents", chemical_form: "Liquid mixture, not part of an article" } },

  },
  {
    id: "us-wildlife-import", title: "Wildlife specimen requires species and permit assessment",
    input: { ...importBase, product: "Captive-bred reptile specimens", product_category: "wildlife", hs_code: "010620",
      technical_specifications: { scientific_name: "Python regius", specimen_source: "Captive bred; supplier claim unverified", specimen_type: "Live animals" } },

  },
  {
    id: "us-forced-labor-risk", title: "Supply-chain labor risk requires human admissibility review",
    input: { ...importBase, product: "Cotton uniforms", product_category: "general_goods", hs_code: "620342", end_use_flags: ["forced_labor"],
      technical_specifications: { supply_chain_traceability: "Demo fabric, spinning, and cotton supplier records" } },

  },
  {
    id: "us-ordinary-export", title: "Ordinary export retains classification and end-use evidence",
    input: { ...exportBase, product: "Office tables", product_category: "general_goods", control_classification: "EAR99",
      technical_specifications: { subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-dual-use-export", title: "Precision equipment requires technical control classification",
    input: { ...exportBase, product: "Precision machine tool", product_category: "dual_use", control_classification: "Proposed ECCN pending technical confirmation",
      technical_specifications: { manufacturer_model: "Demo precision model A", subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-computing-export", title: "Computing module needs model and recipient-specific review",
    input: { ...exportBase, product: "AI computing module", product_category: "advanced_computing", control_classification: "Supplier proposes advanced-computing ECCN; unverified",
      technical_specifications: { manufacturer_model: "Demo accelerator A", performance: "Supplier performance datasheet attached in evidence store", subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-encryption-export", title: "Encrypted software needs ENC/classification assessment",
    input: { ...exportBase, product: "Encrypted backup software", product_category: "encryption", transaction_type: "technology_transfer", control_classification: "Supplier proposes 5D002; unverified",
      technical_specifications: { manufacturer_model: "Demo Backup 1.0", cryptographic_function: "Encrypted customer backups", subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-military-export", title: "Military component requires DDTC/BIS jurisdiction review",
    input: { ...exportBase, product: "Military aircraft component", product_category: "military", control_classification: "Supplier proposes USML entry; unverified",
      technical_specifications: { manufacturer_model: "Demo military component A", subject_to_ear: false, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-nuclear-export", title: "Nuclear equipment requires authorization and agency review",
    input: { ...exportBase, product: "Nuclear reactor component", product_category: "nuclear",
      technical_specifications: { nuclear_item_type: "Reactor equipment component", nuclear_material_details: "No radioactive material according to demo supplier", subject_to_ear: false, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-sensitive-end-use", title: "EAR99 goods can still trigger end-use review",
    input: { ...exportBase, product: "Industrial spare parts", product_category: "general_goods", control_classification: "EAR99", end_use_flags: ["diversion"],
      technical_specifications: { subject_to_ear: true, bis_specific_notice_requires_license: false, end_use_evidence: "Demo request includes unexplained onward shipment" } },

  },
  {
    id: "us-bis-specific-notice", title: "Supplied BIS notice establishes a conditional license finding",
    input: { ...exportBase, product: "Controlled industrial equipment", product_category: "dual_use", control_classification: "Demo classified item per notice",
      technical_specifications: { manufacturer_model: "Demo equipment B", subject_to_ear: true, bis_specific_notice_requires_license: true, bis_notice_reference: "DEMO ONLY: supplied BIS notice for this exact transaction" } },

  },
  {
    id: "us-missing-classification", title: "Missing classification remains unknown and requests evidence",
    input: { from_country: "US", to_country: "CA", product: "Industrial sensor", product_category: "dual_use", end_use_flags: [],
      technical_specifications: { subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-missing-plant-status", title: "Agricultural product with missing plant status requests follow-up",
    input: { ...importBase, product: "Unspecified agricultural commodity", product_category: "food_agriculture" },

  },
  {
    id: "us-origin-reexport", title: "U.S.-origin goods retain export review on foreign reexport",
    input: { ...exportBase, from_country: "CA", to_country: "JP", product: "U.S.-origin precision machine tool", transaction_type: "reexport", product_category: "dual_use",
      control_classification: "Supplier classification awaiting review", technical_specifications: { manufacturer_model: "Demo precision model A", subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
  {
    id: "us-category-nonmatch", title: "Ordinary furniture does not match specialized product packs",
    input: { ...exportBase, product: "Wooden office tables", product_category: "general_goods", control_classification: "EAR99",
      technical_specifications: { subject_to_ear: true, bis_specific_notice_requires_license: false } },

  },
];

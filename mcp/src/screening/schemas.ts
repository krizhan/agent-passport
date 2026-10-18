import { z } from "zod";
import { evaluationSchema, restrictedPartySchema } from "../schemas.js";

const webUrl = z.url().refine((value) => /^https?:\/\//i.test(value));
export const listMetadataSchema = z.object({
  source: z.string().min(1),
  last_imported: z.string().min(1),
  source_last_updated: z.string().nullable(),
});

export const recordSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(1), source: z.string().min(1),
  alt_names: z.array(z.string()).nullish(), country: z.string().nullish(),
  addresses: z.array(z.object({
    address: z.string().nullish(), city: z.string().nullish(), state: z.string().nullish(),
    postal_code: z.string().nullish(), country: z.string().nullish(),
  })).nullish(),
  programs: z.array(z.string()).nullish(),
  source_list_url: webUrl.nullish(), source_information_url: webUrl.nullish(),
  remarks: z.string().nullish(), license_requirement: z.string().nullish(),
});

export const datasetSchema = z.object({
  results: z.array(recordSchema).min(1),
  total: z.number().int().positive(), offset: z.literal(0),
  search_performed_at: z.string().min(1),
  sources_used: z.array(listMetadataSchema).min(1),
});

export const candidateSchema = z.object({
  id: z.string(), name: z.string(), source: z.string(),
  matched_query: z.string(), matched_name: z.string(),
  match_method: z.enum(["exact", "token_order", "token_subset", "bigram_similarity"]),
  similarity_score: z.number().min(0).max(1),
  country_match: z.enum(["MATCH", "DIFFERENT", "UNKNOWN", "NOT_SUPPLIED"]),
  countries: z.array(z.string()), addresses: z.array(z.string()),
  programs: z.array(z.string()), source_list_url: webUrl.nullable(), source_information_url: webUrl.nullable(),
  remarks: z.string().nullable(), license_requirement: z.string().nullable(),
});

export const screeningResultSchema = z.object({
  status: z.enum(["NO_CANDIDATES", "POTENTIAL_MATCH", "UNAVAILABLE"]),
  source: z.object({
    name: z.literal("U.S. Consolidated Screening List"), url: webUrl,
    retrieved_at: z.iso.datetime().nullable(), dataset_generated_at: z.string().nullable(),
    http_last_modified: z.string().nullable(), sha256: z.string().nullable(),
    upstream_sha256: z.string().nullable(),
    mode: z.literal("bundled_json"), live_lookup_performed: z.literal(false),
    freshness: z.enum(["RECENT", "STALE", "UNAVAILABLE"]), age_hours: z.number().nonnegative().nullable(),
    records_screened: z.number().int().nonnegative(), lists: z.array(listMetadataSchema),
  }),
  matching: z.object({
    method: z.literal("normalized_names_aliases_tokens_bigrams/v1"),
    threshold: z.literal(0.85), country_filter_applied: z.literal(false),
  }),
  total_matches: z.number().int().nonnegative(), truncated: z.boolean(),
  matches: z.array(candidateSchema).max(20),
  error: z.string().nullable(), limitations: z.array(z.string()),
});

export const screeningEvaluationSchema = evaluationSchema.extend({
  action: restrictedPartySchema,
  screening: screeningResultSchema,
});

export type CSLRecord = z.infer<typeof recordSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type ScreeningResult = z.infer<typeof screeningResultSchema>;

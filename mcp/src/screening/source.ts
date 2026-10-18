import { createHash } from "node:crypto";
import { z } from "zod";
import bundledList from "../../data/consolidated-screening-list.json" with { type: "json" };
import bundledMetadata from "../../data/consolidated-screening-list.meta.json" with { type: "json" };
import { sources } from "../policies/us-restricted-party/sources.js";
import { datasetSchema, type Dataset } from "./schemas.js";

export const MAX_DATA_AGE_MS = 48 * 60 * 60 * 1000;
const metadataSchema = z.object({
  source_url: z.literal(sources.download),
  retrieved_at: z.iso.datetime(), http_last_modified: z.string().nullable(),
  dataset_generated_at: z.string(), records: z.number().int().positive(), sources: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), upstream_sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

// Require the currently modeled source set. Added sources are included too.
// Missing sources make the assessment unavailable, rather than silently narrowing coverage.
export const REQUIRED_SOURCES = [
  "Capta List (CAP) - Treasury Department",
  "Non-SDN Chinese Military-Industrial Complex Companies List (CMIC) - Treasury Department",
  "Denied Persons List (DPL) - Bureau of Industry and Security",
  "ITAR Debarred (DTC) - State Department",
  "Entity List (EL) - Bureau of Industry and Security",
  "Foreign Sanctions Evaders (FSE) - Treasury Department",
  "Nonproliferation Sanctions (ACN) - State Department",
  "Non-SDN Menu-Based Sanctions List (NS-MBS List) - Treasury Department",
  "Military End User (MEU) List - Bureau of Industry and Security",
  "Palestinian Legislative Council List (PLC) - Treasury Department",
  "Specially Designated Nationals (SDN) - Treasury Department",
  "Sectoral Sanctions Identifications List (SSI) - Treasury Department",
  "Unverified List (UVL) - Bureau of Industry and Security",
] as const;

export class ScreeningSourceError extends Error {}

export interface Snapshot {
  dataset: Dataset;
  retrievedAt: string;
  lastModified: string | null;
  sha256: string;
  upstreamSha256: string;
  freshness: "RECENT" | "STALE";
  ageHours: number;
}

function validTimestamp(value: string, now: Date) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time - now.getTime() <= 5 * 60 * 1000;
}

export function validateDataset(raw: unknown, now: Date): Dataset {
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) throw new ScreeningSourceError("The bundled CSL snapshot has an unexpected format; screening was not completed.");
  const dataset = parsed.data;
  const declared = new Set(dataset.sources_used.map((entry) => entry.source));
  if (dataset.total !== dataset.results.length || REQUIRED_SOURCES.some((source) => !declared.has(source))
    || dataset.results.some((entry) => !declared.has(entry.source))
    || new Set(dataset.results.map((entry) => JSON.stringify([entry.source, entry.id]))).size !== dataset.results.length) {
    throw new ScreeningSourceError("The bundled CSL snapshot is incomplete or has inconsistent source coverage; screening was not completed.");
  }
  if (!validTimestamp(dataset.search_performed_at, now)
    || dataset.sources_used.some((entry) => !validTimestamp(entry.last_imported, now))) {
    throw new ScreeningSourceError("The bundled CSL generation or source-import timestamp is invalid or in the future; refresh the snapshot before screening.");
  }
  return dataset;
}

export function loadSnapshot(signal?: AbortSignal): Snapshot {
  signal?.throwIfAborted();
  const parsed = metadataSchema.safeParse(bundledMetadata);
  if (!parsed.success) throw new ScreeningSourceError("The bundled CSL provenance metadata is invalid; refresh the snapshot before screening.");
  const metadata = parsed.data;
  // Canonical JSON is committed and imported into the server bundle. No network
  // access, runtime asset path, or caller-supplied dataset is involved.
  const sha256 = createHash("sha256").update(JSON.stringify(bundledList) + "\n").digest("hex");
  if (sha256 !== metadata.sha256) throw new ScreeningSourceError("The bundled CSL checksum does not match its provenance metadata; refresh the snapshot before screening.");
  const now = new Date();
  const dataset = validateDataset(bundledList, now);
  if (!validTimestamp(metadata.retrieved_at, now) || metadata.records !== dataset.results.length
    || metadata.sources !== dataset.sources_used.length || metadata.dataset_generated_at !== dataset.search_performed_at) {
    throw new ScreeningSourceError("The bundled CSL provenance does not match the snapshot; refresh it before screening.");
  }
  const ageMs = Math.max(0, now.getTime() - Date.parse(dataset.search_performed_at),
    ...dataset.sources_used.map((entry) => now.getTime() - Date.parse(entry.last_imported)));
  signal?.throwIfAborted();
  return {
    dataset, retrievedAt: metadata.retrieved_at, lastModified: metadata.http_last_modified,
    sha256, upstreamSha256: metadata.upstream_sha256,
    freshness: ageMs > MAX_DATA_AGE_MS ? "STALE" : "RECENT",
    ageHours: Math.round(ageMs / 3600_000 * 100) / 100,
  };
}

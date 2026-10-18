import { createHash } from "node:crypto";
import { sources } from "../policies/us-restricted-party/sources.js";
import { datasetSchema, type Dataset } from "./schemas.js";

export const MAX_DATA_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;

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
}

function freshTimestamp(value: string, now: Date) {
  const time = Date.parse(value);
  return Number.isFinite(time) && now.getTime() - time <= MAX_DATA_AGE_MS
    && time - now.getTime() <= 5 * 60 * 1000;
}

export function validateDataset(raw: unknown, now: Date): Dataset {
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) throw new ScreeningSourceError("The official CSL download has an unexpected format; screening was not completed.");
  const dataset = parsed.data;
  const declared = new Set(dataset.sources_used.map((entry) => entry.source));
  if (dataset.total !== dataset.results.length || REQUIRED_SOURCES.some((source) => !declared.has(source))
    || dataset.results.some((entry) => !declared.has(entry.source))
    || new Set(dataset.results.map((entry) => JSON.stringify([entry.source, entry.id]))).size !== dataset.results.length) {
    throw new ScreeningSourceError("The official CSL download is incomplete or has inconsistent source coverage; screening was not completed.");
  }
  if (!freshTimestamp(dataset.search_performed_at, now)
    || dataset.sources_used.some((entry) => !freshTimestamp(entry.last_imported, now))) {
    throw new ScreeningSourceError("The CSL generation or source-import timestamp is missing, invalid, or more than 48 hours old; refresh the official data before screening.");
  }
  return dataset;
}

export async function loadSnapshot(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<Snapshot> {
  // No submitted names leave the server: only the fixed public data URL is fetched.
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetcher(sources.download, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" }, redirect: "error",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok || !response.body) throw new ScreeningSourceError("The official CSL download is unavailable; retry screening before relying on a result.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DOWNLOAD_BYTES) throw new ScreeningSourceError("The official CSL download exceeds the supported size; screening was not completed.");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  let raw: unknown;
  try { raw = JSON.parse(bytes.toString("utf8")); }
  catch { throw new ScreeningSourceError("The official CSL download is not valid JSON; screening was not completed."); }
  const now = new Date();
  return {
    dataset: validateDataset(raw, now), retrievedAt: now.toISOString(),
    lastModified: response.headers.get("last-modified"), sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

import { createHash } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const sourceUrl = "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json";
const snapshotUrl = new URL("../data/consolidated-screening-list.json", import.meta.url);
const archiveUrl = new URL("../data/consolidated-screening-list.json.gz", import.meta.url);
const metadataUrl = new URL("../data/consolidated-screening-list.meta.json", import.meta.url);
const previous = JSON.parse(await readFile(snapshotUrl, "utf8"));
const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(60_000), redirect: "error" });
if (!response.ok || !response.body) throw new Error(`Official CSL download failed: HTTP ${response.status}`);
const chunks = [];
let size = 0;
for await (const chunk of response.body) {
  size += chunk.byteLength;
  if (size > 64 * 1024 * 1024) throw new Error("Official CSL download exceeds 64 MiB; existing snapshot was not changed.");
  chunks.push(chunk);
}
const original = Buffer.concat(chunks);
const dataset = JSON.parse(original.toString("utf8"));
const declaredSources = new Set(dataset.sources_used?.map(entry => entry.source));
if (!Array.isArray(dataset.results) || !dataset.results.length || dataset.offset !== 0
  || dataset.total !== dataset.results.length || !Array.isArray(dataset.sources_used)
  || !dataset.sources_used.length || !Number.isFinite(Date.parse(dataset.search_performed_at))
  || previous.sources_used.some(entry => !declaredSources.has(entry.source))
  || dataset.results.some(entry => !entry.id || !entry.name || !declaredSources.has(entry.source))
  || new Set(dataset.results.map(entry => JSON.stringify([entry.source, entry.id]))).size !== dataset.results.length) {
  throw new Error("Official CSL download is incomplete or has changed format; existing snapshot was not changed.");
}
const checksum = value => createHash("sha256").update(value).digest("hex");
const content = JSON.stringify(dataset) + "\n";
const metadata = {
  source_url: sourceUrl, retrieved_at: new Date().toISOString(),
  http_last_modified: response.headers.get("last-modified"),
  dataset_generated_at: dataset.search_performed_at,
  records: dataset.results.length, sources: dataset.sources_used.length,
  sha256: checksum(content), upstream_sha256: checksum(original),
};
const temporarySnapshot = new URL(snapshotUrl.href + ".tmp");
const temporaryArchive = new URL(archiveUrl.href + ".tmp");
const temporaryMetadata = new URL(metadataUrl.href + ".tmp");
await writeFile(temporarySnapshot, content);
await writeFile(temporaryArchive, gzipSync(content, { level: 9 }));
await writeFile(temporaryMetadata, JSON.stringify(metadata, null, 2) + "\n");
await rename(temporarySnapshot, snapshotUrl);
await rename(temporaryArchive, archiveUrl);
await rename(temporaryMetadata, metadataUrl);
console.log(`Updated bundled CSL: ${metadata.records} records, ${metadata.sources} sources, generated ${metadata.dataset_generated_at}. Rebuild and redeploy to publish it.`);

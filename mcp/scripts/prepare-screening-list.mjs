import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const snapshotUrl = new URL("../data/consolidated-screening-list.json", import.meta.url);
const archiveUrl = new URL("../data/consolidated-screening-list.json.gz", import.meta.url);
const metadataUrl = new URL("../data/consolidated-screening-list.meta.json", import.meta.url);
const [archive, metadataText] = await Promise.all([readFile(archiveUrl), readFile(metadataUrl, "utf8")]);
const metadata = JSON.parse(metadataText);
const snapshot = gunzipSync(archive, { maxOutputLength: 64 * 1024 * 1024 });
const checksum = value => createHash("sha256").update(value).digest("hex");
if (checksum(snapshot) !== metadata.sha256) {
  throw new Error("The compressed CSL snapshot does not match its provenance metadata. Refresh the screening list before building.");
}

let existing;
try {
  existing = await readFile(snapshotUrl);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (existing && checksum(existing) !== metadata.sha256) {
  throw new Error("The CSL JSON snapshot does not match its compressed copy and metadata. Refresh the screening list before building.");
}
if (!existing) await writeFile(snapshotUrl, snapshot);
console.log(`Prepared bundled CSL JSON: ${metadata.records} records from ${metadata.sources} source lists.`);

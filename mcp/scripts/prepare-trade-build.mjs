import { copyFile, mkdir } from "node:fs/promises";

const destination = new URL("../.trade-build/data/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ["consolidated-screening-list.json", "consolidated-screening-list.meta.json"]) {
  await copyFile(new URL(`../data/${name}`, import.meta.url), new URL(name, destination));
}

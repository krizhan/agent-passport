import { readFileSync } from "node:fs";
import type { CheckInput } from "../src/schemas.js";
export const now = new Date("2026-10-17T12:00:00Z");
export function fixture(name: string): CheckInput {
  return JSON.parse(readFileSync(new URL("../../fixtures/" + name + ".json", import.meta.url), "utf8"));
}

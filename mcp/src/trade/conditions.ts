import type { Condition } from "./types.js";

export type ConditionResult = { status: "MATCHED" | "NOT_MATCHED" | "UNKNOWN"; missing: string[] };
export function fieldValue(input: unknown, path: string): unknown {
  let value: unknown = input;
  for (const part of path.split(".")) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, part)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
export const isMissing = (value: unknown): boolean => value === undefined || value === null || value === ""
  || (Array.isArray(value) && value.length === 0);

export function evaluateCondition(condition: Condition | undefined, input: unknown): ConditionResult {
  if (!condition) return { status: "MATCHED", missing: [] };
  if ("not" in condition) {
    const result = evaluateCondition(condition.not, input);
    return { ...result, status: result.status === "UNKNOWN" ? "UNKNOWN" : result.status === "MATCHED" ? "NOT_MATCHED" : "MATCHED" };
  }
  if ("all" in condition || "any" in condition) {
    const all = "all" in condition;
    const results = (all ? condition.all : (condition as { any: readonly Condition[] }).any).map((child) => evaluateCondition(child, input));
    const status = all
      ? results.some((r) => r.status === "NOT_MATCHED") ? "NOT_MATCHED" : results.some((r) => r.status === "UNKNOWN") ? "UNKNOWN" : "MATCHED"
      : results.some((r) => r.status === "MATCHED") ? "MATCHED" : results.some((r) => r.status === "UNKNOWN") ? "UNKNOWN" : "NOT_MATCHED";
    return { status, missing: status === "UNKNOWN" ? [...new Set(results.flatMap((r) => r.missing))] : [] };
  }
  const value = fieldValue(input, condition.field);
  if (condition.op === "exists") return { status: (!isMissing(value)) === (condition.value ?? true) ? "MATCHED" : "NOT_MATCHED", missing: [] };
  // An explicitly supplied empty list is a known negative for membership tests.
  if (value === undefined || value === null || value === "") return { status: "UNKNOWN", missing: [condition.field] };
  const expected = condition.value;
  if ((condition.op === "eq" && typeof value !== typeof expected)
    || ((condition.op === "gte" || condition.op === "lte") && typeof value !== "number")
    || (condition.op === "contains" && !Array.isArray(value))) {
    return { status: "UNKNOWN", missing: [condition.field] };
  }
  let matched = false;
  switch (condition.op) {
    case "eq": matched = value === expected; break;
    case "in": matched = Array.isArray(expected) && expected.includes(value as string); break;
    case "contains": matched = Array.isArray(value) && value.includes(expected); break;
    case "gte": matched = typeof value === "number" && typeof expected === "number" && value >= expected; break;
    case "lte": matched = typeof value === "number" && typeof expected === "number" && value <= expected; break;
  }
  return { status: matched ? "MATCHED" : "NOT_MATCHED", missing: [] };
}

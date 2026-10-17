import type { Action, Requirement, RuleResult } from "../schemas.js";
export interface PolicyRule {
  readonly requirement: Requirement;
  evaluate(action: Action, now: Date): RuleResult;
}
export interface PolicyPack {
  readonly id: string;
  readonly version: string;
  readonly scope: string;
  readonly requirements: readonly Requirement[];
  readonly rules?: readonly PolicyRule[];
  readonly unassessed_topics?: readonly string[];
}

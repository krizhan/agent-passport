import type { Requirement } from "../schemas.js";

export interface PolicyPack {
  readonly id: string;
  readonly version: string;
  readonly scope: string;
  readonly requirements: readonly Requirement[];
}

import { iso31661 } from "iso-3166";
import { z } from "zod";

// Only assigned entries are accepted; reserved, obsolete, and user-assigned codes are excluded.
const assignedCountryCodes = new Set(iso31661.map((country) => country.alpha2));

export const countrySchema = z.string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, {
    error: "Use a two-letter ISO 3166-1 country/territory code, such as US or GB.",
    abort: true,
  })
  .refine((code) => assignedCountryCodes.has(code), {
    error: ({ input }) => input === "UK"
      ? "Use GB for the United Kingdom; UK is not an assigned ISO 3166-1 alpha-2 code."
      : "Unrecognized or unassigned country/territory code. Use an assigned ISO 3166-1 alpha-2 code, such as US or GB.",
  });

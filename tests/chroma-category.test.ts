import { describe, expect, it } from "vitest";

import { getChromaCategory } from "../src/lib/colour-analysis/chroma-category";

describe("getChromaCategory", () => {
  it.each([
    [0, "Low"],
    [0.079, "Low"],
    [0.08, "Moderate"],
    [0.159, "Moderate"],
    [0.16, "High"],
    [0.219, "High"],
    [0.22, "Very high"],
  ] as const)("categorises OKLCH chroma %s as %s", (chroma, category) => {
    expect(getChromaCategory(chroma)).toBe(category);
  });

  it.each([-0.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid chroma %s",
    (chroma) => {
      expect(() => getChromaCategory(chroma)).toThrow(
        "Sunset chroma must be a finite non-negative number",
      );
    },
  );
});

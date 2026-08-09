import { describe, expect, it } from "vitest";

import { SUNSET_COLOUR_TAXONOMY } from "../src/domain/sunset-colour-taxonomy";
import { createInstrumentClassification } from "../src/lib/colour-analysis";

describe("createInstrumentClassification", () => {
  it("stores a stable sector classification without SVG coordinates", () => {
    const coral = SUNSET_COLOUR_TAXONOMY[23];
    const classification = createInstrumentClassification({
      dominantColour: coral.representativeHex,
      hue: coral.representativeOklch.h,
      saturation: 0.8,
      chroma: 0.18,
      colourFamily: coral.family,
    });

    expect(classification).toEqual({
      sectorId: "S24",
      sectorName: "Open Coral",
      colourFamily: "Coral",
      angle: 138,
      chroma: 0.18,
      radialPosition: 0.72,
      radialMetric: "oklch-chroma",
    });
    expect(classification).not.toHaveProperty("x");
    expect(classification).not.toHaveProperty("y");
  });
});

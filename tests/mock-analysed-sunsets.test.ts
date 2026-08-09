import { describe, expect, it } from "vitest";

import { MOCK_ANALYSED_SUNSETS } from "../src/data/mock-analysed-sunsets";
import { SUNSET_COLOUR_TAXONOMY } from "../src/domain/sunset-colour-taxonomy";
import { sunsetToInstrumentPosition } from "../src/lib/colour-analysis";

describe("mock analyzed sunsets", () => {
  it("provides 20–30 complete development entries", () => {
    expect(MOCK_ANALYSED_SUNSETS.length).toBeGreaterThanOrEqual(20);
    expect(MOCK_ANALYSED_SUNSETS.length).toBeLessThanOrEqual(30);

    for (const sunset of MOCK_ANALYSED_SUNSETS) {
      expect(sunset).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          originalFilename: expect.any(String),
          displayName: expect.any(String),
          nameSource: "generated",
          image: expect.any(String),
          date: expect.any(String),
          location: expect.any(String),
          dominantColour: expect.any(String),
          hue: expect.any(Number),
          saturation: expect.any(Number),
          chroma: expect.any(Number),
          colourFamily: expect.any(String),
          classification: expect.objectContaining({
            sectorId: expect.stringMatching(/^S\d{2}$/),
            sectorName: expect.any(String),
            angle: expect.any(Number),
            chroma: expect.any(Number),
            radialPosition: expect.any(Number),
          }),
        }),
      );
    }
  });

  it("derives every position from measured fields and the expected sector", () => {
    for (const sunset of MOCK_ANALYSED_SUNSETS) {
      const position = sunsetToInstrumentPosition(sunset);

      const sectorCode = SUNSET_COLOUR_TAXONOMY.find(
        (sector) => sector.id === position.sectorId,
      )?.code;

      expect(sectorCode).toBe(sunset.classification.sectorId);
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
      expect(sunset.classification).not.toHaveProperty("x");
      expect(sunset.classification).not.toHaveProperty("y");
    }
  });

  it("contains deliberate exact overlaps without storing coordinates", () => {
    const positionKeys = MOCK_ANALYSED_SUNSETS.map((sunset) => {
      const position = sunsetToInstrumentPosition(sunset);
      return `${position.x.toFixed(4)},${position.y.toFixed(4)}`;
    });
    const uniquePositions = new Set(positionKeys);

    expect(uniquePositions.size).toBeLessThan(positionKeys.length);
    expect(
      MOCK_ANALYSED_SUNSETS.every(
        (sunset) => !("x" in sunset) && !("y" in sunset),
      ),
    ).toBe(true);
  });
});

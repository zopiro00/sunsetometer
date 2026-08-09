import { describe, expect, it } from "vitest";

import { SUNSET_COLOUR_TAXONOMY } from "../src/domain/sunset-colour-taxonomy";
import {
  DEFAULT_INSTRUMENT_POSITION_OPTIONS,
  sunsetToInstrumentPosition,
} from "../src/lib/colour-analysis";

function inputForSector(index: number) {
  const sector = SUNSET_COLOUR_TAXONOMY[index];

  return {
    dominantColour: sector.representativeHex,
    hue: sector.representativeOklch.h,
    saturation: 0.5,
    chroma: 0.125,
    colourFamily: sector.family,
  };
}

describe("sunsetToInstrumentPosition", () => {
  it("places low-chroma sunsets near the inner boundary", () => {
    const position = sunsetToInstrumentPosition({
      ...inputForSector(10),
      chroma: 0.01,
    });
    const expectedDistance =
      DEFAULT_INSTRUMENT_POSITION_OPTIONS.innerRadius +
      0.04 *
        (DEFAULT_INSTRUMENT_POSITION_OPTIONS.outerRadius -
          DEFAULT_INSTRUMENT_POSITION_OPTIONS.innerRadius);
    const actualDistance = Math.hypot(
      position.x - DEFAULT_INSTRUMENT_POSITION_OPTIONS.centreX,
      position.y - DEFAULT_INSTRUMENT_POSITION_OPTIONS.centreY,
    );

    expect(position.normalisedRadius).toBeCloseTo(0.04);
    expect(actualDistance).toBeCloseTo(expectedDistance);
    expect(position.radialMetric).toBe("oklch-chroma");
  });

  it("places high-chroma sunsets at the outer boundary", () => {
    const position = sunsetToInstrumentPosition({
      ...inputForSector(18),
      chroma: 0.4,
    });
    const actualDistance = Math.hypot(
      position.x - DEFAULT_INSTRUMENT_POSITION_OPTIONS.centreX,
      position.y - DEFAULT_INSTRUMENT_POSITION_OPTIONS.centreY,
    );

    expect(position.normalisedRadius).toBe(1);
    expect(actualDistance).toBeCloseTo(
      DEFAULT_INSTRUMENT_POSITION_OPTIONS.outerRadius,
    );
  });

  it("can switch radial distance to HSL saturation", () => {
    const position = sunsetToInstrumentPosition(
      {
        ...inputForSector(24),
        saturation: 0.9,
        chroma: 0.01,
      },
      { radialMetric: "hsl-saturation" },
    );

    expect(position.normalisedRadius).toBe(0.9);
    expect(position.radialMetric).toBe("hsl-saturation");
  });

  it("keeps colours near a sector boundary in an adjacent sector", () => {
    const first = SUNSET_COLOUR_TAXONOMY[22];
    const second = SUNSET_COLOUR_TAXONOMY[23];
    const midpoint = {
      r: Math.round(
        (first.representativeRgb.r + second.representativeRgb.r) / 2,
      ),
      g: Math.round(
        (first.representativeRgb.g + second.representativeRgb.g) / 2,
      ),
      b: Math.round(
        (first.representativeRgb.b + second.representativeRgb.b) / 2,
      ),
    };
    const position = sunsetToInstrumentPosition({
      dominantColour: midpoint,
      hue:
        (first.representativeOklch.h + second.representativeOklch.h) / 2,
      saturation: 0.6,
      chroma: 0.14,
      colourFamily: "Coral",
    });

    expect([first.id, second.id]).toContain(position.sectorId);
    expect(position.angle).toBeGreaterThanOrEqual(first.chromaticAngle - 3);
    expect(position.angle).toBeLessThanOrEqual(second.chromaticAngle + 3);
  });

  it("wraps positions cleanly across the first and last sectors", () => {
    const first = sunsetToInstrumentPosition(inputForSector(0));
    const last = sunsetToInstrumentPosition(inputForSector(59));
    const wrappedFirst = sunsetToInstrumentPosition({
      ...inputForSector(0),
      hue: -1,
    });

    expect(first.sectorId).toBe(SUNSET_COLOUR_TAXONOMY[0].id);
    expect(first.angle).toBe(0);
    expect(last.sectorId).toBe(SUNSET_COLOUR_TAXONOMY[59].id);
    expect(last.angle).toBe(354);
    expect(wrappedFirst.angle).toBeGreaterThanOrEqual(357);
    expect(wrappedFirst.angle).toBeLessThan(360);
  });

  it("rejects invalid measured values and geometry", () => {
    expect(() =>
      sunsetToInstrumentPosition({
        ...inputForSector(0),
        hue: Number.NaN,
      }),
    ).toThrow("hue must be a finite");

    expect(() =>
      sunsetToInstrumentPosition({
        ...inputForSector(0),
        saturation: 1.1,
      }),
    ).toThrow("saturation must be between");

    expect(() =>
      sunsetToInstrumentPosition({
        ...inputForSector(0),
        chroma: -0.1,
      }),
    ).toThrow("chroma must be");

    expect(() =>
      sunsetToInstrumentPosition({
        ...inputForSector(0),
        colourFamily: " ",
      }),
    ).toThrow("colour family must not be empty");

    expect(() =>
      sunsetToInstrumentPosition(inputForSector(0), {
        innerRadius: 400,
        outerRadius: 300,
      }),
    ).toThrow("Invalid Sunsetometer instrument geometry");
  });
});

import { describe, expect, it } from "vitest";

import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import {
  getAtlasDisplayColour,
} from "@/lib/colour-analysis/atlas-display-colour";
import { hexToRgb, rgbToOklch } from "@/lib/colour-analysis/colour-space";

describe("getAtlasDisplayColour", () => {
  it("returns a deterministic valid HEX colour", () => {
    const sector = SUNSET_COLOUR_TAXONOMY[23];
    expect(getAtlasDisplayColour(sector)).toMatch(/^#[0-9A-F]{6}$/);
    expect(getAtlasDisplayColour(sector)).toBe(getAtlasDisplayColour(sector));
  });

  it("preserves approximate hue while reducing saturated-sector chroma", () => {
    const sector = SUNSET_COLOUR_TAXONOMY[23];
    const display = rgbToOklch(hexToRgb(getAtlasDisplayColour(sector)));
    const hueDifference = Math.min(
      Math.abs(display.h - sector.representativeOklch.h),
      360 - Math.abs(display.h - sector.representativeOklch.h),
    );
    expect(hueDifference).toBeLessThan(12);
    expect(display.c).toBeLessThan(sector.representativeOklch.c);
  });

  it("keeps neighbouring low-chroma sectors distinguishable", () => {
    expect(getAtlasDisplayColour(SUNSET_COLOUR_TAXONOMY[52])).not.toBe(
      getAtlasDisplayColour(SUNSET_COLOUR_TAXONOMY[53]),
    );
  });

  it("moves farther toward paper as paper mix increases", () => {
    const sector = SUNSET_COLOUR_TAXONOMY[17];
    expect(getAtlasDisplayColour(sector, { paperMix: 0 })).not.toBe(
      getAtlasDisplayColour(sector, { paperMix: 0.4 }),
    );
  });
});

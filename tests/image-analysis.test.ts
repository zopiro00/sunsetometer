import { describe, expect, it } from "vitest";

import type { RgbColour } from "../src/domain/sunset-colour";
import { analyseSkyPixels } from "../src/lib/colour-analysis/image-analysis";

const WIDTH = 40;
const HEIGHT = 20;

function syntheticPixels(
  colourAt: (x: number, y: number) => RgbColour,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const colour = colourAt(x, y);
      const index = (y * WIDTH + x) * 4;
      pixels[index] = colour.r;
      pixels[index + 1] = colour.g;
      pixels[index + 2] = colour.b;
      pixels[index + 3] = 255;
    }
  }

  return pixels;
}

describe("analyseSkyPixels", () => {
  it("finds blue sky despite dark foreground contamination", () => {
    const result = analyseSkyPixels(
      syntheticPixels((_x, y) =>
        y > 14 ? { r: 13, g: 15, b: 17 } : { r: 93, g: 152, b: 211 },
      ),
      WIDTH,
      HEIGHT,
    );

    expect(result.primarySkyColour.rgb.b).toBeGreaterThan(
      result.primarySkyColour.rgb.r,
    );
    expect(result.debug.excludedPixels).toBe(200);
  });

  it("finds orange sky despite black silhouettes", () => {
    const result = analyseSkyPixels(
      syntheticPixels((x, y) =>
        y > 15 && x % 3 === 0
          ? { r: 0, g: 0, b: 0 }
          : { r: 232, g: 118, b: 54 },
      ),
      WIDTH,
      HEIGHT,
    );

    expect(result.primarySkyColour.rgb.r).toBeGreaterThan(
      result.primarySkyColour.rgb.b * 2,
    );
    expect(result.debug.excludedPixels).toBeGreaterThan(0);
  });

  it("preserves coral and violet clusters in a multicolour sky", () => {
    const result = analyseSkyPixels(
      syntheticPixels((x) =>
        x < 24
          ? { r: 226, g: 95, b: 91 }
          : { r: 104, g: 87, b: 143 },
      ),
      WIDTH,
      HEIGHT,
    );

    expect(result.primarySkyColour.rgb.r).toBeGreaterThan(180);
    expect(result.secondarySkyColours).toHaveLength(1);
    expect(result.secondarySkyColours[0].rgb.b).toBeGreaterThan(
      result.secondarySkyColours[0].rgb.r,
    );
    expect(result.debug.clusters[0].isPrimary).toBe(true);
  });

  it("retains a pale low-saturation sky", () => {
    const result = analyseSkyPixels(
      syntheticPixels(() => ({ r: 196, g: 207, b: 214 })),
      WIDTH,
      HEIGHT,
    );

    expect(result.primarySkyColour.chroma).toBeLessThan(0.04);
    expect(result.primarySkyColour.lightness).toBeGreaterThan(0.7);
  });

  it("returns a confident centre for a nearly monochromatic sky", () => {
    const result = analyseSkyPixels(
      syntheticPixels((x) =>
        x % 2 === 0
          ? { r: 242, g: 171, b: 119 }
          : { r: 240, g: 168, b: 116 },
      ),
      WIDTH,
      HEIGHT,
    );

    expect(result.primarySkyColour.confidence).toBeGreaterThan(0.9);
    expect(result.secondarySkyColours).toHaveLength(0);
  });

  it("rejects invalid dimensions and all-black selections", () => {
    expect(() =>
      analyseSkyPixels(new Uint8ClampedArray(), 0, 0),
    ).toThrow("positive image dimensions");
    expect(() =>
      analyseSkyPixels(
        syntheticPixels(() => ({ r: 0, g: 0, b: 0 })),
        WIDTH,
        HEIGHT,
      ),
    ).toThrow("enough visible sky pixels");
  });
});

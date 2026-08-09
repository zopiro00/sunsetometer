import { describe, expect, it } from "vitest";

import {
  SUNSET_COLOUR_TAXONOMY,
  SUNSET_COLOUR_TAXONOMY_VERSION,
  SUNSETOMETER_PERIMETER_LABELS,
} from "../src/domain/sunset-colour-taxonomy";
import {
  convertMeasuredColourToSunsetometerSector,
  findNearestSector,
  getNeighbouringSectors,
} from "../src/lib/colour-analysis";

describe("Sunsetometer colour taxonomy", () => {
  it("contains 60 ordered, fully described sectors", () => {
    expect(SUNSET_COLOUR_TAXONOMY).toHaveLength(60);

    SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
      expect(sector.index).toBe(index);
      expect(sector.code).toBe(`S${String(index + 1).padStart(2, "0")}`);
      expect(sector.chromaticAngle).toBe(index * 6);
      expect(sector.name.length).toBeGreaterThan(0);
      expect(sector.family.length).toBeGreaterThan(0);
      expect(sector.representativeHex).toMatch(/^#[\dA-F]{6}$/);
      expect(sector.representativeRgb).toEqual(
        expect.objectContaining({
          r: expect.any(Number),
          g: expect.any(Number),
          b: expect.any(Number),
        }),
      );
      expect(sector.representativeOklch).toEqual(
        expect.objectContaining({
          l: expect.any(Number),
          c: expect.any(Number),
          h: expect.any(Number),
        }),
      );
    });
  });

  it("wraps neighbours around the authored sequence", () => {
    const first = SUNSET_COLOUR_TAXONOMY[0];
    const last = SUNSET_COLOUR_TAXONOMY[59];
    const [beforeFirst, afterFirst] = getNeighbouringSectors(first.id);
    const [beforeLast, afterLast] = getNeighbouringSectors(last.id);

    expect(beforeFirst.id).toBe(last.id);
    expect(afterFirst.code).toBe("S02");
    expect(beforeLast.code).toBe("S59");
    expect(afterLast.id).toBe(first.id);
  });

  it("keeps every classification code unique and stable", () => {
    expect(SUNSET_COLOUR_TAXONOMY.map((sector) => sector.code)).toEqual(
      Array.from(
        { length: 60 },
        (_, index) => `S${String(index + 1).padStart(2, "0")}`,
      ),
    );
    expect(
      new Set(SUNSET_COLOUR_TAXONOMY.map((sector) => sector.id)).size,
    ).toBe(60);
  });

  it("anchors concise perimeter labels to valid permanent sectors", () => {
    expect(SUNSETOMETER_PERIMETER_LABELS).toHaveLength(10);

    for (const annotation of SUNSETOMETER_PERIMETER_LABELS) {
      expect(
        SUNSET_COLOUR_TAXONOMY.some(
          (sector) => sector.id === annotation.sectorId,
        ),
      ).toBe(true);
      expect(annotation.label.length).toBeGreaterThan(0);
    }
  });

  it("returns an exact sector for its representative HEX colour", () => {
    const coral = SUNSET_COLOUR_TAXONOMY.find(
      (sector) => sector.name === "Open Coral",
    );

    expect(coral).toBeDefined();
    expect(findNearestSector(coral!.representativeHex).id).toBe(coral!.id);
  });

  it("accepts measured RGB values and returns a versioned perceptual match", () => {
    const match = convertMeasuredColourToSunsetometerSector({
      r: 58,
      g: 93,
      b: 119,
    });

    expect(match.sector.name).toBe("First Twilight Blue");
    expect(match.perceptualDistance).toBe(0);
    expect(match.method).toBe("oklab-euclidean");
    expect(match.taxonomyVersion).toBe(SUNSET_COLOUR_TAXONOMY_VERSION);
  });

  it("rejects invalid colours and unknown sector IDs", () => {
    expect(() => findNearestSector("#not-a-colour")).toThrow(
      "Invalid HEX colour",
    );
    expect(() => getNeighbouringSectors("missing-sector")).toThrow(
      "Unknown Sunsetometer sector",
    );
  });
});

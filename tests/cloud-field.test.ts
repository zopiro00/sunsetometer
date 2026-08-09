import { describe, expect, it } from "vitest";

import type { CloudFieldData } from "@/domain/cloud-field";
import {
  cloudProvenanceLines,
  destinationPoint,
  isValidCloudField,
  normaliseCloudAmount,
} from "@/lib/cloud-field";

const cloudField: CloudFieldData = {
  timestamp: "2026-08-07T21:00:00Z",
  bounds: [-5, 35, 5, 45],
  grid: [
    [10, 35],
    [60, 90],
  ],
  variable: "total cloud cover",
  units: "%",
  source: "Copernicus ERA5",
  dataType: "reanalysis",
  spatialResolution: "~0.25° grid",
};

describe("cloud-field utilities", () => {
  it("accepts a well-formed rectangular grid", () => {
    expect(isValidCloudField(cloudField)).toBe(true);
  });

  it("rejects malformed or geographically inverted grids", () => {
    expect(
      isValidCloudField({
        ...cloudField,
        bounds: [5, 35, -5, 45],
        grid: [[10], [20, 30]],
      }),
    ).toBe(false);
  });

  it("normalises percentage and fractional cloud amounts", () => {
    expect(normaliseCloudAmount(75, "%")).toBe(0.75);
    expect(normaliseCloudAmount(0.6, "fraction")).toBe(0.6);
    expect(normaliseCloudAmount(140, "%")).toBe(1);
  });

  it("labels reanalysis without implying satellite observation", () => {
    expect(cloudProvenanceLines(cloudField)).toEqual([
      "Cloud field · reanalysis",
      "Copernicus ERA5",
      "21:00 UTC",
      "~0.25° grid",
    ]);
  });

  it("projects a solar bearing from the observation point", () => {
    const [longitude, latitude] = destinationPoint(0, 0, 270, 100);

    expect(longitude).toBeLessThan(0);
    expect(latitude).toBeCloseTo(0, 8);
  });
});

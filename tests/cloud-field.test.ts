import { describe, expect, it } from "vitest";

import type { CloudFieldData } from "@/domain/cloud-field";
import {
  cloudCrossAppearance,
  cloudFieldGridAxes,
  cloudFieldSamples,
  cloudProvenanceLines,
  destinationPoint,
  distanceBetweenCoordinates,
  isValidCloudField,
  normaliseCloudAmount,
  projectCloudCoordinate,
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

  it("preserves each sampled value at its actual grid coordinate", () => {
    const samples = cloudFieldSamples(cloudField);

    expect(samples).toHaveLength(4);
    expect(samples[0]).toMatchObject({
      latitude: 45,
      longitude: -5,
      value: 10,
      normalisedAmount: 0.1,
    });
    expect(samples[3]).toMatchObject({
      latitude: 35,
      longitude: 5,
      value: 90,
      normalisedAmount: 0.9,
    });
  });

  it("uses larger, stronger crosses for greater cloud cover", () => {
    const faint = cloudCrossAppearance(0.1);
    const dense = cloudCrossAppearance(0.9);

    expect(dense.halfSize).toBeGreaterThan(faint.halfSize);
    expect(dense.opacity).toBeGreaterThan(faint.opacity);
  });

  it("projects geographic sample coordinates into the field bounds", () => {
    expect(projectCloudCoordinate(-5, 45, cloudField.bounds)).toEqual({ x: 0, y: 0 });
    const southEast = projectCloudCoordinate(5, 35, cloudField.bounds);
    expect(southEast.x).toBe(100);
    expect(southEast.y).toBeCloseTo(100, 10);
  });

  it("uses only actual sample rows and columns for grid axes", () => {
    expect(cloudFieldGridAxes(cloudField)).toEqual({
      x: [0, 100],
      y: [0, expect.closeTo(100, 10)],
    });
  });

  it("calculates approximate distance from the photograph", () => {
    expect(distanceBetweenCoordinates(0, 0, 1, 0)).toBeCloseTo(111.2, 0);
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

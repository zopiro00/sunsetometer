import { describe, expect, it } from "vitest";

import {
  closestTimeIndex,
  createCloudGridCoordinates,
  sunsetDateToIso,
} from "@/services/weather/open-meteo-cloud-field";

describe("Open-Meteo cloud-field adapter", () => {
  it("converts Sunsetometer display dates without locale-dependent parsing", () => {
    expect(sunsetDateToIso("18 Jun 2025")).toBe("2025-06-18");
    expect(sunsetDateToIso("2025-06-18")).toBe("2025-06-18");
    expect(sunsetDateToIso("Date unavailable")).toBeNull();
  });

  it("creates a deterministic north-to-south regional sampling grid", () => {
    const field = createCloudGridCoordinates({
      latitude: 40.4,
      longitude: -3.7,
      placeName: "Madrid, Spain",
      precision: "city",
    });

    expect(field.coordinates).toHaveLength(169);
    expect(field.coordinates[0].latitude).toBe(field.bounds[3]);
    expect(field.coordinates[168].latitude).toBe(field.bounds[1]);
    expect(field.coordinates[0].longitude).toBe(field.bounds[0]);
    expect(field.coordinates[12].longitude).toBe(field.bounds[2]);
  });

  it("selects the analysis hour nearest the calculated observation time", () => {
    expect(
      closestTimeIndex(
        ["2025-06-18T18:00", "2025-06-18T19:00", "2025-06-18T20:00"],
        "2025-06-18T19:42",
      ),
    ).toBe(2);
    expect(closestTimeIndex([], "2025-06-18T19:42")).toBe(-1);
  });
});

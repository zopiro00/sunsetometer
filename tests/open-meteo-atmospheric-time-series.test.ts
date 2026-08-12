import { describe, expect, it } from "vitest";

import {
  normaliseAtmosphericTimeSeries,
  selectAtmosphericWindow,
} from "@/services/weather/open-meteo-atmospheric-time-series";

const hourlyTimes = [
  "2025-06-18T17:00",
  "2025-06-18T18:00",
  "2025-06-18T19:00",
  "2025-06-18T20:00",
  "2025-06-18T21:00",
  "2025-06-18T22:00",
  "2025-06-18T23:00",
];

function payload(overrides: Record<string, unknown> = {}) {
  return {
    hourly: {
      time: hourlyTimes,
      cloud_cover: [20, 25, 30, 40, 55, 65, 70],
      temperature_2m: [25, 24, 23, 22, 21, 20, 19],
      ...overrides,
    },
    hourly_units: {
      cloud_cover: "%",
      temperature_2m: "°C",
      visibility: "undefined",
    },
  };
}

describe("Open-Meteo local atmospheric time series", () => {
  it("selects the hourly window from three hours before to two hours after sunset", () => {
    const selected = selectAtmosphericWindow(
      [
        "2025-06-18T20:00",
        "2025-06-18T21:00",
        "2025-06-18T22:00",
        "2025-06-18T23:00",
        "2025-06-19T00:00",
        "2025-06-19T01:00",
        "2025-06-19T02:00",
      ],
      "2025-06-18T23:30:00Z",
    );

    expect(selected.indexes).toEqual([1, 2, 3, 4, 5]);
    expect(selected.relativeMinutes).toEqual([-150, -90, -30, 30, 90]);
  });

  it("normalises missing provider variables as unavailable rather than inventing values", () => {
    const series = normaliseAtmosphericTimeSeries({
      payload: payload(),
      sunsetTimestamp: "2025-06-18T20:30:00Z",
    });

    expect(series.records[0].values.cloudCoverPercent).toBe(25);
    expect(series.records[0].values.lowCloudCoverPercent).toBeNull();
    expect(series.records[0].values.windDirectionDegrees).toBeNull();
    expect(series.records[0].units.windDirectionDegrees).toBe("°");
    expect(series.records[0].units.visibilityMetres).toBe("m");
  });

  it("handles a local sunset whose offset crosses the UTC date boundary", () => {
    const selected = selectAtmosphericWindow(
      [
        "2025-06-18T21:00",
        "2025-06-18T22:00",
        "2025-06-18T23:00",
        "2025-06-19T00:00",
        "2025-06-19T01:00",
        "2025-06-19T02:00",
      ],
      "2025-06-19T00:30",
      2 * 60 * 60,
    );

    expect(selected.relativeMinutes).toEqual([-150, -90, -30, 30, 90]);
  });

  it("identifies the nearest atmospheric record for a capture before sunset", () => {
    const series = normaliseAtmosphericTimeSeries({
      payload: payload(),
      sunsetTimestamp: "2025-06-18T20:30:00Z",
      captureTimestamp: "2025-06-18T19:10:00Z",
    });

    expect(series.selectedRecord?.timestamp).toBe("2025-06-18T19:00:00.000Z");
    expect(series.selectedRecord?.relativeMinutesFromSunset).toBe(-90);
  });

  it("identifies the nearest atmospheric record for a capture after sunset", () => {
    const series = normaliseAtmosphericTimeSeries({
      payload: payload(),
      sunsetTimestamp: "2025-06-18T20:30:00Z",
      captureTimestamp: "2025-06-18T21:40:00Z",
    });

    expect(series.selectedRecord?.timestamp).toBe("2025-06-18T22:00:00.000Z");
    expect(series.selectedRecord?.relativeMinutesFromSunset).toBe(90);
  });
});

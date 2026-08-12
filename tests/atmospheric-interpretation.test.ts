import { describe, expect, it } from "vitest";
import { MOCK_ANALYSED_SUNSETS } from "@/data/mock-analysed-sunsets";
import type { AtmosphericTimeRecord, AtmosphericValues } from "@/domain/atmospheric-time-series";
import { interpretSunsetAtmosphere } from "@/lib/atmospheric-interpretation";

const emptyValues: AtmosphericValues = {
  cloudCoverPercent: null,
  lowCloudCoverPercent: null,
  midCloudCoverPercent: null,
  highCloudCoverPercent: null,
  temperatureCelsius: null,
  relativeHumidityPercent: null,
  dewPointCelsius: null,
  precipitationMillimetres: null,
  surfacePressureHectopascals: null,
  visibilityMetres: null,
  windSpeedKilometresPerHour: null,
  windDirectionDegrees: null,
  windGustsKilometresPerHour: null,
  directRadiationWattsPerSquareMetre: null,
  diffuseRadiationWattsPerSquareMetre: null,
  aerosolOpticalDepth: null,
  pm2_5MicrogramsPerCubicMetre: null,
  pm10MicrogramsPerCubicMetre: null,
  dustMicrogramsPerCubicMetre: null,
};

function record(values: Partial<AtmosphericValues>): AtmosphericTimeRecord {
  return {
    timestamp: "2025-06-18T20:00:00Z",
    relativeMinutesFromSunset: 0,
    values: { ...emptyValues, ...values },
    source: "Copernicus ERA5 via Open-Meteo",
    dataType: "reanalysis",
    units: {} as AtmosphericTimeRecord["units"],
  };
}

describe("rule-based atmospheric interpretation", () => {
  it("activates the upper-cloud rule and exposes its exact evidence", () => {
    const interpretation = interpretSunsetAtmosphere({
      sunset: { ...MOCK_ANALYSED_SUNSETS[0], minutesFromSunset: 14 },
      atmosphericRecord: record({
        highCloudCoverPercent: 68,
        lowCloudCoverPercent: 8,
      }),
      sunsetTimestamp: "2025-06-18T20:00:00Z",
      location: null,
    });
    const rule = interpretation.rules.find(
      ({ id }) => id === "upper-cloud-open-lower-atmosphere",
    );

    expect(rule).toBeDefined();
    expect(rule?.evidence.map(({ key }) => key)).toEqual([
      "minutesFromSunset",
      "highCloudCoverPercent",
      "lowCloudCoverPercent",
    ]);
  });

  it("uses only cautious causal language", () => {
    const interpretation = interpretSunsetAtmosphere({
      sunset: { ...MOCK_ANALYSED_SUNSETS[0], minutesFromSunset: 10 },
      atmosphericRecord: record({
        highCloudCoverPercent: 70,
        midCloudCoverPercent: 40,
        lowCloudCoverPercent: 5,
      }),
      sunsetTimestamp: "2025-06-18T20:00:00Z",
      location: null,
    });
    const text = interpretation.rules.map((rule) => rule.text).join(" ");

    expect(text).not.toMatch(/\b(caused|proves|created the colour|definitely explains)\b/i);
    expect(text).toMatch(/may have|could have|is consistent with|suggests/i);
  });

  it("returns an evidence-bearing fallback rather than inventing conditions", () => {
    const interpretation = interpretSunsetAtmosphere({
      sunset: { ...MOCK_ANALYSED_SUNSETS[0], minutesFromSunset: -90 },
      atmosphericRecord: record({}),
      sunsetTimestamp: "2025-06-18T20:00:00Z",
      location: null,
    });

    expect(interpretation.rules).toHaveLength(1);
    expect(interpretation.rules[0].id).toBe("limited-structured-evidence");
    expect(interpretation.rules[0].evidence.length).toBeGreaterThan(0);
  });
});

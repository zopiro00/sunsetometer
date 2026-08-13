import { describe, expect, it } from "vitest";

import { MOCK_ANALYSED_SUNSETS } from "@/data/mock-analysed-sunsets";
import { selectExportContent } from "@/lib/export/export-content-rules";
import { DEFAULT_SUNSET_EXPORT_OPTIONS } from "@/lib/export/sunset-poster";

const sunset = MOCK_ANALYSED_SUNSETS[0];
const atmosphere = {
  solarElevationDegrees: -2.4,
  highCloudCoverPercent: 70,
  midCloudCoverPercent: 42,
  lowCloudCoverPercent: 12,
  humidityPercent: 76,
  visibilityKilometres: 18.3,
  cloudCoverPercent: 61,
  summary: "Higher cloud layers may have supported the observed warm afterglow.",
};

describe("selectExportContent", () => {
  it("keeps postcard fronts visual and free of metric lists", () => {
    expect(selectExportContent({
      atmosphere,
      options: { ...DEFAULT_SUNSET_EXPORT_OPTIONS, format: "postcard" },
      sunset,
      surface: "postcard-front",
    })).toEqual({ metrics: [] });
  });

  it("keeps standard poster content to timing and a few atmospheric metrics", () => {
    const result = selectExportContent({
      atmosphere,
      options: DEFAULT_SUNSET_EXPORT_OPTIONS,
      sunset,
      surface: "poster",
    });
    expect(result.metrics).toHaveLength(4);
    expect(result.metrics[0]).toMatch(/sunset/);
    expect(result.metrics.join(" ")).toContain("Cloud layers");
    expect(result.metrics.join(" ")).not.toContain("Primary sky colour");
  });

  it("keeps minimal poster content to relative sunset timing", () => {
    const result = selectExportContent({
      atmosphere,
      options: { ...DEFAULT_SUNSET_EXPORT_OPTIONS, density: "minimal" },
      sunset,
      surface: "poster",
    });
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0]).toMatch(/sunset/);
  });

  it("allows more evidence on detailed postcard backs without overcrowding", () => {
    const result = selectExportContent({
      atmosphere,
      options: {
        ...DEFAULT_SUNSET_EXPORT_OPTIONS,
        density: "detailed",
        format: "postcard",
        sides: "front-back",
      },
      sunset,
      surface: "postcard-back",
    });
    expect(result.metrics.length).toBeLessThanOrEqual(10);
    expect(result.interpretation).toBe(atmosphere.summary);
  });

  it("omits unavailable atmospheric values instead of showing zeros", () => {
    const result = selectExportContent({
      options: DEFAULT_SUNSET_EXPORT_OPTIONS,
      sunset,
      surface: "poster",
    });
    expect(result.metrics.join(" ")).not.toMatch(/cloud|humidity|visibility/i);
  });
});

import { describe, expect, it } from "vitest";

import { solarAzimuth } from "@/lib/solar-position";

describe("solar azimuth", () => {
  it("places an equatorial equinox evening sun in the west", () => {
    const azimuth = solarAzimuth({
      timestamp: "2025-03-20T18:00:00Z",
      latitude: 0,
      longitude: 0,
    });

    expect(azimuth).not.toBeNull();
    expect(azimuth!).toBeGreaterThan(260);
    expect(azimuth!).toBeLessThan(280);
  });

  it("rejects invalid timestamps", () => {
    expect(solarAzimuth({ timestamp: "unknown", latitude: 0, longitude: 0 })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  solarAzimuth,
  solarElevation,
  twilightPhase,
} from "@/lib/solar-position";

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

  it("places the equatorial equinox midday sun high above the horizon", () => {
    const elevation = solarElevation({
      timestamp: "2025-03-20T12:00:00Z",
      latitude: 0,
      longitude: 0,
    });

    expect(elevation).not.toBeNull();
    expect(elevation!).toBeGreaterThan(85);
  });

  it("classifies twilight from solar elevation without inferring weather", () => {
    expect(twilightPhase(2)).toBe("Daylight");
    expect(twilightPhase(-3)).toBe("Civil twilight");
    expect(twilightPhase(-9)).toBe("Nautical twilight");
    expect(twilightPhase(-15)).toBe("Astronomical twilight");
    expect(twilightPhase(-20)).toBe("Night");
    expect(twilightPhase(null)).toBeNull();
  });
});

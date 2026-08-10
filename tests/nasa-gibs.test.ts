import { describe, expect, it } from "vitest";

import { nasaGibsSatelliteImage } from "@/services/weather/nasa-gibs";

describe("NASA GIBS satellite image", () => {
  it("builds a dated regional WMS request without credentials", () => {
    const image = nasaGibsSatelliteImage(
      {
        latitude: 40.48,
        longitude: -3.48,
        placeName: "Madrid region, Spain",
        precision: "region",
      },
      "2026-07-07",
    );
    const url = new URL(image.url);

    expect(url.hostname).toBe("gibs.earthdata.nasa.gov");
    expect(url.searchParams.get("LAYERS")).toBe(
      "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    );
    expect(url.searchParams.get("TIME")).toBe("2026-07-07");
    expect(image.coordinates).toHaveLength(4);
    expect(image.bounds).toHaveLength(4);
  });
});

import type { ApproximateMapLocation } from "@/domain/cloud-field";

export function nasaGibsSatelliteImage(
  location: ApproximateMapLocation,
  date: string,
): {
  url: string;
  bounds: [number, number, number, number];
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  acquisitionTimestamp: string | null;
  temporalContext: "same-date-daytime-reference";
} {
  const halfLatitudeSpan = 3;
  const halfLongitudeSpan = Math.min(
    5,
    halfLatitudeSpan /
      Math.max(0.45, Math.cos(location.latitude * Math.PI / 180)),
  );
  const west = location.longitude - halfLongitudeSpan;
  const east = location.longitude + halfLongitudeSpan;
  const south = location.latitude - halfLatitudeSpan;
  const north = location.latitude + halfLatitudeSpan;
  const parameters = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.1.1",
    LAYERS: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    STYLES: "",
    FORMAT: "image/jpeg",
    WIDTH: "1200",
    HEIGHT: "675",
    SRS: "EPSG:4326",
    BBOX: `${west},${south},${east},${north}`,
    TIME: date,
  });

  return {
    url: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${parameters}`,
    bounds: [west, south, east, north],
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    // This daily GIBS layer does not expose a single acquisition timestamp for
    // the requested swath. A future time-matched geostationary adapter can
    // populate this field without changing the map component contract.
    acquisitionTimestamp: null,
    temporalContext: "same-date-daytime-reference",
  };
}

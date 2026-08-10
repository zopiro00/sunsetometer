import type {
  ApproximateMapLocation,
  CloudFieldData,
} from "@/domain/cloud-field";

const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const GRID_SIZE = 7;
const HALF_LATITUDE_SPAN = 2.25;

type OpenMeteoLocationResponse = {
  hourly?: {
    time?: string[];
    cloud_cover?: (number | null)[];
    temperature_2m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation?: (number | null)[];
    surface_pressure?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    visibility?: (number | null)[];
  };
  daily?: {
    sunset?: (string | null)[];
  };
};

export type CloudGridCoordinate = {
  latitude: number;
  longitude: number;
};

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

export function sunsetDateToIso(date: string): string | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());

  if (isoMatch) {
    return date.trim();
  }

  const displayMatch = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(date.trim());

  if (!displayMatch) {
    return null;
  }

  const [, day, monthName, year] = displayMatch;
  const month = MONTHS[monthName];

  if (!month) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function createCloudGridCoordinates(
  location: ApproximateMapLocation,
): {
  bounds: [number, number, number, number];
  coordinates: CloudGridCoordinate[];
} {
  const latitudeRadians = location.latitude * Math.PI / 180;
  const halfLongitudeSpan = Math.min(
    4,
    HALF_LATITUDE_SPAN / Math.max(0.45, Math.cos(latitudeRadians)),
  );
  const west = location.longitude - halfLongitudeSpan;
  const east = location.longitude + halfLongitudeSpan;
  const south = location.latitude - HALF_LATITUDE_SPAN;
  const north = location.latitude + HALF_LATITUDE_SPAN;
  const coordinates: CloudGridCoordinate[] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const latitude = north - row * (north - south) / (GRID_SIZE - 1);

    for (let column = 0; column < GRID_SIZE; column += 1) {
      const longitude = west + column * (east - west) / (GRID_SIZE - 1);
      coordinates.push({ latitude, longitude });
    }
  }

  return { bounds: [west, south, east, north], coordinates };
}

export function closestTimeIndex(times: readonly string[], target: string): number {
  const targetTime = Date.parse(`${target}Z`);

  if (!Number.isFinite(targetTime) || times.length === 0) {
    return -1;
  }

  return times.reduce((closestIndex, time, index) => {
    const distance = Math.abs(Date.parse(`${time}Z`) - targetTime);
    const closestDistance = Math.abs(
      Date.parse(`${times[closestIndex]}Z`) - targetTime,
    );

    return distance < closestDistance ? index : closestIndex;
  }, 0);
}

export async function fetchOpenMeteoCloudField({
  location,
  date,
  captureTimestamp,
  minutesFromSunset = 0,
  signal,
}: {
  location: ApproximateMapLocation;
  date: string;
  captureTimestamp?: string;
  minutesFromSunset?: number;
  signal?: AbortSignal;
}): Promise<CloudFieldData> {
  const isoDate = sunsetDateToIso(date);

  if (!isoDate) {
    throw new Error("A valid observation date is required for cloud reanalysis");
  }

  const { bounds, coordinates } = createCloudGridCoordinates(location);
  const parameters = new URLSearchParams({
    latitude: coordinates.map(({ latitude }) => latitude.toFixed(4)).join(","),
    longitude: coordinates.map(({ longitude }) => longitude.toFixed(4)).join(","),
    start_date: isoDate,
    end_date: isoDate,
    hourly: [
      "cloud_cover",
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "surface_pressure",
      "wind_speed_10m",
      "visibility",
    ].join(","),
    daily: "sunset",
    timezone: "UTC",
    models: "era5",
  });
  const response = await fetch(`${OPEN_METEO_ARCHIVE_URL}?${parameters}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Cloud reanalysis request failed (${response.status})`);
  }

  const payload = await response.json() as
    | OpenMeteoLocationResponse
    | OpenMeteoLocationResponse[];
  const locations = Array.isArray(payload) ? payload : [payload];
  const centreIndex = Math.floor(locations.length / 2);
  const centre = locations[centreIndex];
  const sunset = centre?.daily?.sunset?.[0];
  const times = centre?.hourly?.time;

  if (!sunset || !times || locations.length !== coordinates.length) {
    throw new Error("The provider did not return a complete regional field");
  }

  const capturedAt = captureTimestamp ? Date.parse(captureTimestamp) : Number.NaN;
  const target = new Date(
    Number.isFinite(capturedAt)
      ? capturedAt
      : Date.parse(`${sunset}Z`) + minutesFromSunset * 60_000,
  ).toISOString().slice(0, 16);
  const timeIndex = closestTimeIndex(times, target);

  if (timeIndex < 0) {
    throw new Error("No reanalysis hour is available near sunset");
  }

  const values = locations.map(
    ({ hourly }) => hourly?.cloud_cover?.[timeIndex] ?? null,
  );
  const grid = Array.from({ length: GRID_SIZE }, (_, row) =>
    values.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE),
  );
  const timestamp = `${times[timeIndex]}:00Z`;
  const targetTimestamp = `${target}:00Z`;

  return {
    timestamp,
    bounds,
    grid,
    variable: "total cloud cover",
    units: "%",
    source: "Copernicus ERA5 · via Open-Meteo",
    dataType: "reanalysis",
    spatialResolution: "~0.25° source grid · sampled at ~80 km",
    temporalResolution: "1 hour",
    closestToCaptureMinutes: Math.round(
      Math.abs(Date.parse(timestamp) - Date.parse(targetTimestamp)) / 60_000,
    ),
    weather: {
      temperatureCelsius: centre.hourly?.temperature_2m?.[timeIndex] ?? null,
      relativeHumidityPercent:
        centre.hourly?.relative_humidity_2m?.[timeIndex] ?? null,
      precipitationMillimetres:
        centre.hourly?.precipitation?.[timeIndex] ?? null,
      surfacePressureHectopascals:
        centre.hourly?.surface_pressure?.[timeIndex] ?? null,
      windSpeedKilometresPerHour:
        centre.hourly?.wind_speed_10m?.[timeIndex] ?? null,
      visibilityMetres: centre.hourly?.visibility?.[timeIndex] ?? null,
    },
  };
}

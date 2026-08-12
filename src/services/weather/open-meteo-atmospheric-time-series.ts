import type { ApproximateMapLocation } from "@/domain/cloud-field";
import type {
  AtmosphericTimeRecord,
  AtmosphericUnits,
  AtmosphericValues,
  LocalAtmosphericTimeSeries,
} from "@/domain/atmospheric-time-series";
import { closestTimeIndex, sunsetDateToIso } from "./open-meteo-cloud-field";

const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const SOURCE = "Copernicus ERA5 via Open-Meteo";
const WINDOW_START_MINUTES = -180;
const WINDOW_END_MINUTES = 120;

const PROVIDER_VARIABLES = [
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "precipitation",
  "surface_pressure",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "direct_radiation",
  "diffuse_radiation",
] as const;

type ProviderVariable = typeof PROVIDER_VARIABLES[number];

type OpenMeteoTimeSeriesResponse = {
  utc_offset_seconds?: number;
  timezone?: string;
  hourly?: { time?: string[] } & Partial<Record<ProviderVariable, (number | null)[]>>;
  hourly_units?: Partial<Record<ProviderVariable, string>>;
  daily?: {
    time?: string[];
    sunset?: (string | null)[];
  };
};

type ConnectedAtmosphericField = Exclude<
  keyof AtmosphericValues,
  | "aerosolOpticalDepth"
  | "pm2_5MicrogramsPerCubicMetre"
  | "pm10MicrogramsPerCubicMetre"
  | "dustMicrogramsPerCubicMetre"
>;

const VALUE_FIELDS: Record<ConnectedAtmosphericField, ProviderVariable> = {
  cloudCoverPercent: "cloud_cover",
  lowCloudCoverPercent: "cloud_cover_low",
  midCloudCoverPercent: "cloud_cover_mid",
  highCloudCoverPercent: "cloud_cover_high",
  temperatureCelsius: "temperature_2m",
  relativeHumidityPercent: "relative_humidity_2m",
  dewPointCelsius: "dew_point_2m",
  precipitationMillimetres: "precipitation",
  surfacePressureHectopascals: "surface_pressure",
  visibilityMetres: "visibility",
  windSpeedKilometresPerHour: "wind_speed_10m",
  windDirectionDegrees: "wind_direction_10m",
  windGustsKilometresPerHour: "wind_gusts_10m",
  directRadiationWattsPerSquareMetre: "direct_radiation",
  diffuseRadiationWattsPerSquareMetre: "diffuse_radiation",
};

const FALLBACK_UNITS: AtmosphericUnits = {
  cloudCoverPercent: "%",
  lowCloudCoverPercent: "%",
  midCloudCoverPercent: "%",
  highCloudCoverPercent: "%",
  temperatureCelsius: "°C",
  relativeHumidityPercent: "%",
  dewPointCelsius: "°C",
  precipitationMillimetres: "mm",
  surfacePressureHectopascals: "hPa",
  visibilityMetres: "m",
  windSpeedKilometresPerHour: "km/h",
  windDirectionDegrees: "°",
  windGustsKilometresPerHour: "km/h",
  directRadiationWattsPerSquareMetre: "W/m²",
  diffuseRadiationWattsPerSquareMetre: "W/m²",
  aerosolOpticalDepth: "dimensionless",
  pm2_5MicrogramsPerCubicMetre: "µg/m³",
  pm10MicrogramsPerCubicMetre: "µg/m³",
  dustMicrogramsPerCubicMetre: "µg/m³",
};

function asUtcTimestamp(timestamp: string, utcOffsetSeconds = 0): string {
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)) {
    return timestamp;
  }

  return new Date(
    Date.parse(`${timestamp}Z`) - utcOffsetSeconds * 1000,
  ).toISOString();
}

function shiftIsoDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function selectAtmosphericWindow(
  timestamps: readonly string[],
  sunsetTimestamp: string,
  utcOffsetSeconds = 0,
): { indexes: number[]; relativeMinutes: number[] } {
  const sunsetTime = Date.parse(asUtcTimestamp(sunsetTimestamp, utcOffsetSeconds));
  const indexes: number[] = [];
  const relativeMinutes: number[] = [];

  timestamps.forEach((timestamp, index) => {
    const time = Date.parse(asUtcTimestamp(timestamp, utcOffsetSeconds));
    const relative = Math.round((time - sunsetTime) / 60_000);

    if (
      Number.isFinite(time) &&
      Number.isFinite(sunsetTime) &&
      relative >= WINDOW_START_MINUTES &&
      relative <= WINDOW_END_MINUTES
    ) {
      indexes.push(index);
      relativeMinutes.push(relative);
    }
  });

  return { indexes, relativeMinutes };
}

export function normaliseAtmosphericTimeSeries({
  payload,
  sunsetTimestamp,
  captureTimestamp,
  minutesFromSunset = 0,
}: {
  payload: OpenMeteoTimeSeriesResponse;
  sunsetTimestamp: string;
  captureTimestamp?: string;
  minutesFromSunset?: number;
}): LocalAtmosphericTimeSeries {
  const times = payload.hourly?.time ?? [];
  const { indexes, relativeMinutes } = selectAtmosphericWindow(
    times,
    sunsetTimestamp,
    payload.utc_offset_seconds ?? 0,
  );
  const units = {
    ...FALLBACK_UNITS,
    ...Object.fromEntries(
      Object.entries(VALUE_FIELDS).map(([field, providerField]) => [
      field,
      !payload.hourly_units?.[providerField] ||
      payload.hourly_units?.[providerField] === "undefined"
        ? FALLBACK_UNITS[field as keyof AtmosphericValues]
        : payload.hourly_units[providerField],
      ]),
    ),
  } as AtmosphericUnits;
  const records: AtmosphericTimeRecord[] = indexes.map((providerIndex, index) => {
    const values = Object.fromEntries(
      Object.entries(VALUE_FIELDS).map(([field, providerField]) => [
        field,
        payload.hourly?.[providerField]?.[providerIndex] ?? null,
      ]),
    ) as AtmosphericValues;
    values.aerosolOpticalDepth = null;
    values.pm2_5MicrogramsPerCubicMetre = null;
    values.pm10MicrogramsPerCubicMetre = null;
    values.dustMicrogramsPerCubicMetre = null;

    return {
      timestamp: new Date(asUtcTimestamp(
        times[providerIndex],
        payload.utc_offset_seconds ?? 0,
      )).toISOString(),
      relativeMinutesFromSunset: relativeMinutes[index],
      values,
      source: SOURCE,
      dataType: "reanalysis",
      units,
    };
  });
  const sunsetTime = Date.parse(asUtcTimestamp(
    sunsetTimestamp,
    payload.utc_offset_seconds ?? 0,
  ));
  const captureTime = captureTimestamp
    ? Date.parse(captureTimestamp)
    : sunsetTime + minutesFromSunset * 60_000;
  const selectedIndex = closestTimeIndex(
    records.map(({ timestamp }) => timestamp.replace(/:00\.000Z$/, "")),
    new Date(captureTime).toISOString().slice(0, 16),
  );

  return {
    sunsetTimestamp: new Date(asUtcTimestamp(
      sunsetTimestamp,
      payload.utc_offset_seconds ?? 0,
    )).toISOString(),
    timeZone: payload.timezone ?? "UTC",
    records,
    selectedRecord: selectedIndex < 0 ? null : records[selectedIndex],
    source: SOURCE,
    dataType: "reanalysis",
    temporalResolution: "1 hour",
  };
}

export async function fetchOpenMeteoAtmosphericTimeSeries({
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
}): Promise<LocalAtmosphericTimeSeries> {
  const isoDate = sunsetDateToIso(date);

  if (!isoDate) {
    throw new Error("A valid observation date is required for atmospheric data");
  }

  const parameters = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    start_date: shiftIsoDate(isoDate, -1),
    end_date: shiftIsoDate(isoDate, 1),
    hourly: PROVIDER_VARIABLES.join(","),
    daily: "sunset",
    timezone: "auto",
    models: "era5",
  });
  const response = await fetch(`${OPEN_METEO_ARCHIVE_URL}?${parameters}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Atmospheric time-series request failed (${response.status})`);
  }

  const payload = await response.json() as OpenMeteoTimeSeriesResponse;
  const sunsetIndex = payload.daily?.time?.indexOf(isoDate) ?? -1;
  const sunset = sunsetIndex < 0 ? null : payload.daily?.sunset?.[sunsetIndex];

  if (!sunset || !payload.hourly?.time) {
    throw new Error("The provider did not return sunset and hourly time-series data");
  }

  return normaliseAtmosphericTimeSeries({
    payload,
    sunsetTimestamp: sunset,
    captureTimestamp,
    minutesFromSunset,
  });
}

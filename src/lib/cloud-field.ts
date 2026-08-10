import type { CloudFieldData } from "@/domain/cloud-field";

export function isValidCloudField(data: CloudFieldData): boolean {
  const [west, south, east, north] = data.bounds;
  const width = data.grid[0]?.length ?? 0;

  return (
    Number.isFinite(Date.parse(data.timestamp)) &&
    [west, south, east, north].every(Number.isFinite) &&
    west < east &&
    south < north &&
    width > 1 &&
    data.grid.length > 1 &&
    data.grid.every(
      (row) =>
        row.length === width &&
        row.every(
          (value) => value === null || (Number.isFinite(value) && value >= 0),
        ),
    )
  );
}

export function normaliseCloudAmount(
  value: number,
  units: string,
): number {
  const normalisedUnits = units.trim().toLowerCase();

  if (normalisedUnits === "%" || normalisedUnits.includes("percent")) {
    return Math.min(1, Math.max(0, value / 100));
  }

  return Math.min(1, Math.max(0, value));
}

export function cloudProvenanceLines(data: CloudFieldData): string[] {
  const label =
    data.dataType === "satellite"
      ? "Satellite"
      : data.dataType === "reanalysis"
        ? "Cloud field · reanalysis"
        : "Cloud field · model";
  const timestamp = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(data.timestamp));

  const lines = [
    label,
    data.source,
    `${timestamp} UTC`,
    data.spatialResolution ?? "Resolution not supplied",
  ];

  if (data.temporalResolution) {
    lines.push(data.temporalResolution);
  }

  if (data.closestToCaptureMinutes !== undefined) {
    lines.push(`nearest analysis: ${data.closestToCaptureMinutes} min`);
  }

  return lines;
}

export function destinationPoint(
  longitude: number,
  latitude: number,
  azimuth: number,
  distanceKilometres = 160,
): [number, number] {
  const radius = 6371;
  const angularDistance = distanceKilometres / radius;
  const bearing = (azimuth * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const destinationLatitude = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) *
        Math.sin(angularDistance) *
        Math.cos(bearing),
  );
  const destinationLongitude =
    longitudeRadians +
    Math.atan2(
      Math.sin(bearing) *
        Math.sin(angularDistance) *
        Math.cos(latitudeRadians),
      Math.cos(angularDistance) -
        Math.sin(latitudeRadians) * Math.sin(destinationLatitude),
    );

  return [
    (destinationLongitude * 180) / Math.PI,
    (destinationLatitude * 180) / Math.PI,
  ];
}

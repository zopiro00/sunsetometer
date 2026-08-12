import type { CloudFieldData } from "@/domain/cloud-field";

export type CloudFieldSample = {
  row: number;
  column: number;
  latitude: number;
  longitude: number;
  value: number;
  normalisedAmount: number;
};

export type CloudCrossAppearance = {
  halfSize: number;
  opacity: number;
};

export type CloudGridAxes = {
  x: readonly number[];
  y: readonly number[];
};

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

export function cloudFieldSamples(data: CloudFieldData): CloudFieldSample[] {
  const [west, south, east, north] = data.bounds;
  const rowCount = data.grid.length;
  const columnCount = data.grid[0]?.length ?? 0;

  return data.grid.flatMap((row, rowIndex) =>
    row.flatMap((value, columnIndex) => {
      if (value === null) {
        return [];
      }

      return [{
        row: rowIndex,
        column: columnIndex,
        latitude: north - (rowIndex / (rowCount - 1)) * (north - south),
        longitude: west + (columnIndex / (columnCount - 1)) * (east - west),
        value,
        normalisedAmount: normaliseCloudAmount(value, data.units),
      }];
    }),
  );
}

export function cloudCrossAppearance(
  normalisedAmount: number,
): CloudCrossAppearance {
  const amount = Math.min(1, Math.max(0, normalisedAmount));

  return {
    halfSize: 0.45 + amount * 1.35,
    opacity: 0.12 + amount * 0.76,
  };
}

export function projectCloudCoordinate(
  longitude: number,
  latitude: number,
  bounds: CloudFieldData["bounds"],
): { x: number; y: number } {
  const [west, south, east, north] = bounds;
  const mercatorY = (value: number) => {
    const latitudeRadians = Math.min(85, Math.max(-85, value)) * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2));
  };
  const northY = mercatorY(north);
  const southY = mercatorY(south);

  return {
    x: ((longitude - west) / (east - west)) * 100,
    y: ((northY - mercatorY(latitude)) / (northY - southY)) * 100,
  };
}

export function cloudFieldGridAxes(data: CloudFieldData): CloudGridAxes {
  const [west, south, east, north] = data.bounds;
  const rowCount = data.grid.length;
  const columnCount = data.grid[0]?.length ?? 0;

  return {
    x: Array.from({ length: columnCount }, (_, columnIndex) =>
      projectCloudCoordinate(
        west + (columnIndex / (columnCount - 1)) * (east - west),
        north,
        data.bounds,
      ).x),
    y: Array.from({ length: rowCount }, (_, rowIndex) =>
      projectCloudCoordinate(
        west,
        north - (rowIndex / (rowCount - 1)) * (north - south),
        data.bounds,
      ).y),
  };
}

export function distanceBetweenCoordinates(
  longitudeA: number,
  latitudeA: number,
  longitudeB: number,
  latitudeB: number,
): number {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const firstLatitude = radians(latitudeA);
  const secondLatitude = radians(latitudeB);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function cloudProvenanceLines(data: CloudFieldData): string[] {
  const label =
    data.dataType === "satellite"
      ? "Satellite reference"
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

export type CloudDataType = "reanalysis" | "satellite" | "model";

export type CloudFieldData = {
  /** ISO timestamp for the represented atmosphere. */
  timestamp: string;
  /** West, south, east and north bounds in decimal degrees. */
  bounds: readonly [number, number, number, number];
  /** Row-major grid, ordered north to south. Values may be null when missing. */
  grid: readonly (readonly (number | null)[])[];
  variable: string;
  units: string;
  source: string;
  dataType: CloudDataType;
  spatialResolution?: string;
  temporalResolution?: string;
  closestToCaptureMinutes?: number;
};

export type ApproximateMapLocation = {
  longitude: number;
  latitude: number;
  placeName: string;
  precision: "city" | "region";
  solarAzimuth?: number;
};

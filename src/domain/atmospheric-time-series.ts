export type AtmosphericDataType = "reanalysis" | "model" | "observation";

export type AtmosphericValues = {
  cloudCoverPercent: number | null;
  lowCloudCoverPercent: number | null;
  midCloudCoverPercent: number | null;
  highCloudCoverPercent: number | null;
  temperatureCelsius: number | null;
  relativeHumidityPercent: number | null;
  dewPointCelsius: number | null;
  precipitationMillimetres: number | null;
  surfacePressureHectopascals: number | null;
  visibilityMetres: number | null;
  windSpeedKilometresPerHour: number | null;
  windDirectionDegrees: number | null;
  windGustsKilometresPerHour: number | null;
  directRadiationWattsPerSquareMetre: number | null;
  diffuseRadiationWattsPerSquareMetre: number | null;
  aerosolOpticalDepth: number | null;
  pm2_5MicrogramsPerCubicMetre: number | null;
  pm10MicrogramsPerCubicMetre: number | null;
  dustMicrogramsPerCubicMetre: number | null;
};

export type AtmosphericUnits = Record<keyof AtmosphericValues, string>;

export type AtmosphericTimeRecord = {
  timestamp: string;
  relativeMinutesFromSunset: number;
  values: AtmosphericValues;
  source: string;
  dataType: AtmosphericDataType;
  units: AtmosphericUnits;
};

export type LocalAtmosphericTimeSeries = {
  sunsetTimestamp: string;
  timeZone: string;
  records: AtmosphericTimeRecord[];
  selectedRecord: AtmosphericTimeRecord | null;
  source: string;
  dataType: "reanalysis";
  temporalResolution: "1 hour";
};

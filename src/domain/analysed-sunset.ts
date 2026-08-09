import type { RadialMetric } from "@/lib/colour-analysis";
import type { OklchColour, RgbColour } from "@/domain/sunset-colour";

export type SunsetometerSectorCode = `S${string}`;

export type InstrumentClassification = {
  sectorId: SunsetometerSectorCode;
  sectorName: string;
  colourFamily: string;
  angle: number;
  chroma: number;
  radialPosition: number;
  radialMetric: RadialMetric;
};

export type SkyRegion = {
  /** Normalised image coordinates in the [0, 1] interval. */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SkyColourMeasurement = {
  hex: `#${string}`;
  rgb: RgbColour;
  oklch: OklchColour;
  hue: number;
  chroma: number;
  lightness: number;
  confidence: number;
};

export type SkyClusterDebug = {
  colour: `#${string}`;
  pixelCount: number;
  populationShare: number;
  score: number;
  isPrimary: boolean;
};

export type SkyAnalysisDebug = {
  cropDataUrl: string;
  exclusionsDataUrl: string;
  totalPixels: number;
  includedPixels: number;
  excludedPixels: number;
  clusters: readonly SkyClusterDebug[];
};

export type SkyAnalysisResult = {
  region: SkyRegion;
  primarySkyColour: SkyColourMeasurement;
  secondarySkyColours: readonly SkyColourMeasurement[];
  averageSkyColour: SkyColourMeasurement;
  horizonColour: SkyColourMeasurement;
  upperSkyColour: SkyColourMeasurement;
  debug?: SkyAnalysisDebug;
};

export type AnalysedSunset = {
  id: string;
  originalFilename: string;
  displayName: string;
  nameSource: "generated" | "user";
  image: string;
  date: string;
  location: string;
  dominantColour: string;
  hue: number;
  saturation: number;
  chroma: number;
  colourFamily: string;
  secondaryColourFamily?: string;
  minutesFromSunset?: number;
  classification: InstrumentClassification;
  skyAnalysis: SkyAnalysisResult;
  source: "device-analysis" | "demo";
};

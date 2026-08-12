import type { jsPDF } from "jspdf";

import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { SunsetExportOptions } from "@/lib/export/sunset-poster";

export type ExportAtmosphereEvidence = {
  cloudCoverPercent?: number;
  highCloudCoverPercent?: number;
  midCloudCoverPercent?: number;
  lowCloudCoverPercent?: number;
  humidityPercent?: number;
  visibilityKilometres?: number;
  solarElevationDegrees?: number;
  summary?: string;
  source?: string;
};

export type PdfTemplateContext = {
  atmosphere?: ExportAtmosphereEvidence;
  imageData: string;
  options: SunsetExportOptions;
  pdf: jsPDF;
  sunset: AnalysedSunset;
};

import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { getChromaCategory } from "@/lib/colour-analysis/chroma-category";
import type { SunsetExportOptions } from "@/lib/export/sunset-poster";
import type { ExportAtmosphereEvidence } from "@/lib/export/templates/types";

export type ExportContentSurface = "poster" | "postcard-front" | "postcard-back";

export type ExportContent = {
  metrics: readonly string[];
  interpretation?: string;
};

function solarTiming(sunset: AnalysedSunset): string | null {
  const minutes = sunset.minutesFromSunset;
  return minutes === undefined
    ? null
    : `${minutes >= 0 ? "+" : "-"}${Math.abs(minutes)} min ${minutes >= 0 ? "after" : "before"} sunset`;
}

function availableCloudLayers(atmosphere?: ExportAtmosphereEvidence): string | null {
  if (!atmosphere) return null;
  const layers = [
    atmosphere.highCloudCoverPercent === undefined ? null : `high ${Math.round(atmosphere.highCloudCoverPercent)}%`,
    atmosphere.midCloudCoverPercent === undefined ? null : `mid ${Math.round(atmosphere.midCloudCoverPercent)}%`,
    atmosphere.lowCloudCoverPercent === undefined ? null : `low ${Math.round(atmosphere.lowCloudCoverPercent)}%`,
  ].filter((value): value is string => Boolean(value));
  return layers.length ? `Cloud layers: ${layers.join(" / ")}` : null;
}

export function selectExportContent({
  atmosphere,
  options,
  sunset,
  surface,
}: {
  atmosphere?: ExportAtmosphereEvidence;
  options: SunsetExportOptions;
  sunset: AnalysedSunset;
  surface: ExportContentSurface;
}): ExportContent {
  if (surface === "postcard-front") return { metrics: [] };

  const posterEssential = [solarTiming(sunset)];
  const backEssential = [
    `Colour family: ${sunset.colourFamily}`,
    solarTiming(sunset),
  ];
  const standard = [
    atmosphere?.solarElevationDegrees === undefined ? null : `Solar elevation: ${atmosphere.solarElevationDegrees.toFixed(1)} degrees`,
    availableCloudLayers(atmosphere),
    atmosphere?.humidityPercent === undefined ? null : `Relative humidity: ${Math.round(atmosphere.humidityPercent)}%`,
    atmosphere?.visibilityKilometres === undefined ? null : `Visibility: ${atmosphere.visibilityKilometres.toFixed(1)} km`,
  ];
  const detailed = [
    sunset.secondaryColourFamily ? `Secondary family: ${sunset.secondaryColourFamily}` : null,
    `Primary sky colour: ${sunset.dominantColour.toUpperCase()}`,
    `Chroma: ${getChromaCategory(sunset.chroma)}`,
    `Sky colour confidence: ${Math.round(sunset.skyAnalysis.primarySkyColour.confidence * 100)}%`,
  ];
  const requested = options.density === "minimal"
    ? surface === "poster" ? posterEssential : backEssential
    : options.density === "standard"
      ? [...(surface === "poster" ? posterEssential : backEssential), ...standard]
      : [...(surface === "poster" ? posterEssential : backEssential), ...standard, ...detailed];
  const limit = surface === "poster"
    ? options.density === "detailed" ? 6 : options.density === "standard" ? 4 : 1
    : options.density === "detailed" ? 10 : options.density === "standard" ? 7 : 4;

  return {
    metrics: requested.filter((value): value is string => Boolean(value)).slice(0, limit),
    interpretation: surface === "postcard-back" && options.density !== "minimal"
      ? atmosphere?.summary
      : surface === "poster" && options.density === "detailed"
        ? atmosphere?.summary
      : undefined,
  };
}

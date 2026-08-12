import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { AtmosphericTimeRecord } from "@/domain/atmospheric-time-series";
import type { ApproximateMapLocation } from "@/domain/cloud-field";
import { solarPosition, twilightPhase } from "@/lib/solar-position";

export type InterpretationEvidence = {
  key: string;
  label: string;
  value: string;
  category: "image" | "solar" | "atmosphere";
};

export type ActivatedAtmosphericRule = {
  id: string;
  text: string;
  evidence: InterpretationEvidence[];
};

export type AtmosphericInterpretation = {
  rules: ActivatedAtmosphericRule[];
  evidenceAvailable: boolean;
};

const WARM_CLOUD_FAMILIES = [
  "coral", "pink", "rose", "salmon", "orange", "vermilion", "red-orange",
];

function evidence(
  key: string,
  label: string,
  value: string,
  category: InterpretationEvidence["category"],
): InterpretationEvidence {
  return { key, label, value, category };
}

function captureTimestamp(
  sunset: AnalysedSunset,
  sunsetTimestamp: string | null,
): string | null {
  if (sunset.captureTimestamp) return sunset.captureTimestamp;
  if (sunsetTimestamp && sunset.minutesFromSunset !== undefined) {
    return new Date(
      Date.parse(sunsetTimestamp) + sunset.minutesFromSunset * 60_000,
    ).toISOString();
  }
  return null;
}

export function interpretSunsetAtmosphere({
  sunset,
  atmosphericRecord,
  sunsetTimestamp,
  location,
}: {
  sunset: AnalysedSunset | undefined;
  atmosphericRecord: AtmosphericTimeRecord | null;
  sunsetTimestamp: string | null;
  location: ApproximateMapLocation | null;
}): AtmosphericInterpretation {
  if (!sunset) return { rules: [], evidenceAvailable: false };

  const values = atmosphericRecord?.values;
  const relativeMinutes = sunset.minutesFromSunset ?? (
    sunset.captureTimestamp && sunsetTimestamp
      ? Math.round(
          (Date.parse(sunset.captureTimestamp) - Date.parse(sunsetTimestamp)) /
            60_000,
        )
      : null
  );
  const capturedAt = captureTimestamp(sunset, sunsetTimestamp);
  const position = capturedAt && location
    ? solarPosition({ timestamp: capturedAt, ...location })
    : null;
  const phase = twilightPhase(position?.elevation ?? null);
  const high = values?.highCloudCoverPercent ?? null;
  const mid = values?.midCloudCoverPercent ?? null;
  const low = values?.lowCloudCoverPercent ?? null;
  const primary = sunset.skyAnalysis.primarySkyColour;
  const secondary = sunset.skyAnalysis.secondarySkyColours[0] ?? null;
  const gradientDifference = Math.abs(
    sunset.skyAnalysis.horizonColour.lightness -
      sunset.skyAnalysis.upperSkyColour.lightness,
  );
  const warmFamily = WARM_CLOUD_FAMILIES.some((family) =>
    sunset.colourFamily.toLowerCase().includes(family) ||
    sunset.secondaryColourFamily?.toLowerCase().includes(family),
  );
  const rules: ActivatedAtmosphericRule[] = [];

  if (
    relativeMinutes !== null && relativeMinutes >= 0 && relativeMinutes <= 45 &&
    high !== null && high >= 45 && low !== null && low <= 25
  ) {
    rules.push({
      id: "upper-cloud-open-lower-atmosphere",
      text: "A relatively open lower atmosphere combined with higher cloud cover may have allowed low-angle sunlight to illuminate upper cloud layers.",
      evidence: [
        evidence("minutesFromSunset", "Relative to sunset", `+${relativeMinutes} min`, "solar"),
        evidence("highCloudCoverPercent", "High cloud cover", `${Math.round(high)}%`, "atmosphere"),
        evidence("lowCloudCoverPercent", "Low cloud cover", `${Math.round(low)}%`, "atmosphere"),
      ],
    });
  }

  if (
    warmFamily && relativeMinutes !== null && relativeMinutes >= -30 &&
    (high !== null && high >= 25 || mid !== null && mid >= 25)
  ) {
    rules.push({
      id: "warm-colour-illuminated-cloud-layers",
      text: "The coral, pink or related warm colour evidence, together with cloud layers near sunset, is consistent with illuminated cloud material that may have contributed to the observed warm tones.",
      evidence: [
        evidence("primarySkyColour", "Primary sky colour", `${primary.hex} · ${sunset.colourFamily}`, "image"),
        evidence("secondarySkyColour", "Secondary sky colour", secondary ? secondary.hex : "Unavailable", "image"),
        evidence("minutesFromSunset", "Relative to sunset", `${relativeMinutes >= 0 ? "+" : ""}${relativeMinutes} min`, "solar"),
        evidence("highMidCloudCover", "High / mid cloud cover", `${high ?? "Unavailable"}% / ${mid ?? "Unavailable"}%`, "atmosphere"),
      ],
    });
  }

  if (
    position && position.elevation <= 10 && position.elevation >= -12 &&
    primary.chroma >= 0.07
  ) {
    rules.push({
      id: "low-solar-angle-chromatic-sky",
      text: "The low solar elevation and measured sky chroma could have supported a stronger separation between warm horizon light and the surrounding sky.",
      evidence: [
        evidence("primarySkyChroma", "Primary sky chroma", primary.chroma.toFixed(3), "image"),
        evidence("solarElevation", "Solar elevation", `${position.elevation.toFixed(1)}°`, "solar"),
        evidence("twilightPhase", "Twilight phase", phase ?? "Unavailable", "solar"),
      ],
    });
  }

  if (gradientDifference >= 0.12 && relativeMinutes !== null) {
    rules.push({
      id: "measured-vertical-sky-gradient",
      text: "The measured difference between horizon and upper-sky lightness suggests a pronounced vertical gradient that may have contributed to the layered appearance.",
      evidence: [
        evidence("skyGradient", "Horizon / upper-sky lightness difference", gradientDifference.toFixed(2), "image"),
        evidence("minutesFromSunset", "Relative to sunset", `${relativeMinutes >= 0 ? "+" : ""}${relativeMinutes} min`, "solar"),
      ],
    });
  }

  if (
    values?.relativeHumidityPercent !== null &&
    values?.relativeHumidityPercent !== undefined &&
    values.relativeHumidityPercent >= 75 &&
    values.visibilityMetres !== null && values.visibilityMetres < 10_000
  ) {
    rules.push({
      id: "humid-low-visibility-air",
      text: "Higher humidity together with reduced visibility is consistent with moisture or haze that may have softened contrast in the sky.",
      evidence: [
        evidence("relativeHumidityPercent", "Relative humidity", `${Math.round(values.relativeHumidityPercent)}%`, "atmosphere"),
        evidence("visibilityMetres", "Visibility", `${(values.visibilityMetres / 1000).toFixed(1)} km`, "atmosphere"),
      ],
    });
  }

  if (rules.length === 0) {
    rules.push({
      id: "limited-structured-evidence",
      text: "The available measured and reanalysis evidence suggests a sunset close to the selected conditions, but it does not support a more specific atmospheric interpretation yet.",
      evidence: [
        evidence("primarySkyColour", "Primary sky colour", `${primary.hex} · ${sunset.colourFamily}`, "image"),
        evidence("primarySkyChroma", "Primary sky chroma", primary.chroma.toFixed(3), "image"),
        evidence("relativeToSunset", "Relative to sunset", relativeMinutes === null ? "Unavailable" : `${relativeMinutes} min`, "solar"),
        evidence("cloudLayers", "High / mid / low cloud cover", `${high ?? "Unavailable"}% / ${mid ?? "Unavailable"}% / ${low ?? "Unavailable"}%`, "atmosphere"),
        evidence("radiation", "Direct / diffuse radiation", `${values?.directRadiationWattsPerSquareMetre ?? "Unavailable"} / ${values?.diffuseRadiationWattsPerSquareMetre ?? "Unavailable"} W/m²`, "atmosphere"),
      ],
    });
  }

  return { rules, evidenceAvailable: true };
}

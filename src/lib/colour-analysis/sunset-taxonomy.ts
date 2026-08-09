import type {
  RgbColour,
  SunsetColourSector,
} from "@/domain/sunset-colour";
import {
  SUNSET_COLOUR_TAXONOMY,
  SUNSET_COLOUR_TAXONOMY_VERSION,
} from "@/domain/sunset-colour-taxonomy";
import {
  hexToRgb,
  oklabDistance,
  rgbToOklab,
} from "@/lib/colour-analysis/colour-space";

export type MeasuredColour = string | RgbColour;

export type SunsetometerColourMatch = {
  sector: SunsetColourSector;
  perceptualDistance: number;
  taxonomyVersion: string;
  method: "oklab-euclidean";
};

function toRgb(colour: MeasuredColour): RgbColour {
  return typeof colour === "string" ? hexToRgb(colour) : colour;
}

export function findNearestSector(
  colour: MeasuredColour,
  taxonomy: readonly SunsetColourSector[] = SUNSET_COLOUR_TAXONOMY,
): SunsetColourSector {
  if (taxonomy.length === 0) {
    throw new Error("Cannot match a colour against an empty taxonomy");
  }

  const measuredLab = rgbToOklab(toRgb(colour));

  return taxonomy.reduce((nearest, candidate) => {
    const nearestDistance = oklabDistance(
      measuredLab,
      rgbToOklab(nearest.representativeRgb),
    );
    const candidateDistance = oklabDistance(
      measuredLab,
      rgbToOklab(candidate.representativeRgb),
    );

    return candidateDistance < nearestDistance ? candidate : nearest;
  });
}

export function getNeighbouringSectors(
  sectorId: string,
  taxonomy: readonly SunsetColourSector[] = SUNSET_COLOUR_TAXONOMY,
): readonly [SunsetColourSector, SunsetColourSector] {
  const sector = taxonomy.find((candidate) => candidate.id === sectorId);

  if (!sector) {
    throw new Error(`Unknown Sunsetometer sector: ${sectorId}`);
  }

  const neighbours = sector.neighbourIds.map((neighbourId) =>
    taxonomy.find((candidate) => candidate.id === neighbourId),
  );

  if (!neighbours[0] || !neighbours[1]) {
    throw new Error(`Incomplete neighbours for Sunsetometer sector: ${sectorId}`);
  }

  return [neighbours[0], neighbours[1]];
}

export function convertMeasuredColourToSunsetometerSector(
  colour: MeasuredColour,
  taxonomy: readonly SunsetColourSector[] = SUNSET_COLOUR_TAXONOMY,
): SunsetometerColourMatch {
  const sector = findNearestSector(colour, taxonomy);
  const measuredLab = rgbToOklab(toRgb(colour));
  const sectorLab = rgbToOklab(sector.representativeRgb);

  return {
    sector,
    perceptualDistance: Number(
      (oklabDistance(measuredLab, sectorLab) * 100).toFixed(4),
    ),
    taxonomyVersion: SUNSET_COLOUR_TAXONOMY_VERSION,
    method: "oklab-euclidean",
  };
}

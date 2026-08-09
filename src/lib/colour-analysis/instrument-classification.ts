import type {
  InstrumentClassification,
  SunsetometerSectorCode,
} from "@/domain/analysed-sunset";
import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import type { SunsetPositionInput } from "@/lib/colour-analysis/instrument-position";
import { sunsetToInstrumentPosition } from "@/lib/colour-analysis/instrument-position";
import { findNearestSector } from "@/lib/colour-analysis/sunset-taxonomy";

/**
 * Produces the geometry-independent classification stored with an analysis.
 * Pixel coordinates are deliberately omitted and are always derived by the
 * instrument renderer from its current dimensions.
 */
export function createInstrumentClassification(
  input: SunsetPositionInput,
): InstrumentClassification {
  const sector = findNearestSector(input.dominantColour);
  const position = sunsetToInstrumentPosition({
    ...input,
    colourFamily: sector.family,
  });

  return Object.freeze({
    sectorId: sector.code as SunsetometerSectorCode,
    sectorName: sector.name,
    colourFamily: sector.family,
    angle: position.angle,
    chroma: input.chroma,
    radialPosition: position.normalisedRadius,
    radialMetric: position.radialMetric,
  });
}

export function getSectorByCode(code: SunsetometerSectorCode) {
  const sector = SUNSET_COLOUR_TAXONOMY.find(
    (candidate) => candidate.code === code,
  );

  if (!sector) {
    throw new Error(`Unknown Sunsetometer sector code: ${code}`);
  }

  return sector;
}

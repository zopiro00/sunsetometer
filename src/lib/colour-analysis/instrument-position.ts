import type { SunsetColourSector } from "@/domain/sunset-colour";
import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import type { MeasuredColour } from "@/lib/colour-analysis/sunset-taxonomy";
import { findNearestSector } from "@/lib/colour-analysis/sunset-taxonomy";
import { pointOnCircle } from "@/lib/radial-geometry";

export type SunsetPositionInput = {
  dominantColour: MeasuredColour;
  /**
   * Dominant perceptual hue in degrees. OKLCH hue is preferred.
   * Values wrap into the [0, 360) interval.
   */
  hue: number;
  /** HSL-style saturation normalized to [0, 1]. */
  saturation: number;
  /** OKLCH chroma. Must be zero or greater. */
  chroma: number;
  colourFamily: string;
};

export type RadialMetric = "oklch-chroma" | "hsl-saturation";

export type InstrumentPositionOptions = {
  centreX: number;
  centreY: number;
  innerRadius: number;
  outerRadius: number;
  angleOffset: number;
  radialMetric: RadialMetric;
  chromaFloor: number;
  chromaCeiling: number;
  taxonomy: readonly SunsetColourSector[];
};

export type SunsetInstrumentPosition = {
  sectorId: string;
  angle: number;
  normalisedRadius: number;
  x: number;
  y: number;
  radialMetric: RadialMetric;
};

export const SUNSETOMETER_VIEWBOX_SIZE = 1000;

/**
 * The instrument currently uses OKLCH chroma for radial distance.
 *
 * A chroma of 0 maps to the inner boundary and 0.25 or above maps to the
 * outer boundary. The ceiling is configurable as the analysis model evolves.
 * Pass `radialMetric: "hsl-saturation"` to use normalized HSL saturation
 * without changing the rendering code.
 */
export const DEFAULT_INSTRUMENT_POSITION_OPTIONS: InstrumentPositionOptions = {
  centreX: SUNSETOMETER_VIEWBOX_SIZE / 2,
  centreY: SUNSETOMETER_VIEWBOX_SIZE / 2,
  innerRadius: 218,
  outerRadius: 388,
  angleOffset: -90,
  radialMetric: "oklch-chroma",
  chromaFloor: 0,
  chromaCeiling: 0.25,
  taxonomy: SUNSET_COLOUR_TAXONOMY,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function signedAngleDifference(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function validateInput(input: SunsetPositionInput): void {
  if (!Number.isFinite(input.hue)) {
    throw new Error("Sunset hue must be a finite number");
  }

  if (
    !Number.isFinite(input.saturation) ||
    input.saturation < 0 ||
    input.saturation > 1
  ) {
    throw new Error("Sunset saturation must be between 0 and 1");
  }

  if (!Number.isFinite(input.chroma) || input.chroma < 0) {
    throw new Error("Sunset chroma must be a finite non-negative number");
  }

  if (input.colourFamily.trim().length === 0) {
    throw new Error("Sunset colour family must not be empty");
  }
}

function validateOptions(options: InstrumentPositionOptions): void {
  if (
    !Number.isFinite(options.centreX) ||
    !Number.isFinite(options.centreY) ||
    !Number.isFinite(options.innerRadius) ||
    !Number.isFinite(options.outerRadius) ||
    options.innerRadius < 0 ||
    options.outerRadius <= options.innerRadius
  ) {
    throw new Error("Invalid Sunsetometer instrument geometry");
  }

  if (
    !Number.isFinite(options.chromaFloor) ||
    !Number.isFinite(options.chromaCeiling) ||
    options.chromaFloor < 0 ||
    options.chromaCeiling <= options.chromaFloor
  ) {
    throw new Error("Invalid Sunsetometer chroma range");
  }

  if (options.taxonomy.length === 0) {
    throw new Error("Sunsetometer taxonomy must not be empty");
  }
}

function normaliseRadialMetric(
  input: SunsetPositionInput,
  options: InstrumentPositionOptions,
): number {
  if (options.radialMetric === "hsl-saturation") {
    return input.saturation;
  }

  return clamp(
    (input.chroma - options.chromaFloor) /
      (options.chromaCeiling - options.chromaFloor),
    0,
    1,
  );
}

/**
 * Maps analyzed sunset colour data into the SVG coordinate system.
 *
 * Sector assignment uses perceptual OKLab matching of `dominantColour` to the
 * authored Sunsetometer taxonomy. The supplied perceptual hue then provides a
 * small, bounded within-sector angular offset, keeping the point inside its
 * classified sector while preserving information close to sector boundaries.
 */
export function sunsetToInstrumentPosition(
  input: SunsetPositionInput,
  overrides: Partial<InstrumentPositionOptions> = {},
): SunsetInstrumentPosition {
  validateInput(input);

  const options: InstrumentPositionOptions = {
    ...DEFAULT_INSTRUMENT_POSITION_OPTIONS,
    ...overrides,
  };
  validateOptions(options);

  const sector = findNearestSector(input.dominantColour, options.taxonomy);
  const sectorWidth = 360 / options.taxonomy.length;
  const hueOffset = clamp(
    signedAngleDifference(sector.representativeOklch.h, normalizeAngle(input.hue)),
    -sectorWidth / 2,
    sectorWidth / 2,
  );
  const angle = normalizeAngle(sector.chromaticAngle + hueOffset);
  const normalisedRadius = normaliseRadialMetric(input, options);
  const radius =
    options.innerRadius +
    normalisedRadius * (options.outerRadius - options.innerRadius);
  const point = pointOnCircle({
    centreX: options.centreX,
    centreY: options.centreY,
    radius,
    angle: angle + options.angleOffset,
  });

  return {
    sectorId: sector.id,
    angle,
    normalisedRadius,
    x: point.x,
    y: point.y,
    radialMetric: options.radialMetric,
  };
}

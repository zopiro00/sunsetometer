import type { SunsetColourSector } from "@/domain/sunset-colour";
import {
  hexToRgb,
  oklabToRgb,
  rgbToOklab,
} from "@/lib/colour-analysis/colour-space";

export const ATLAS_PAPER_HEX = "#F1EBDD";
export const ATLAS_CHROMA_SCALE = 0.78;
export const ATLAS_PAPER_MIX = 0.18;
export const ATLAS_DARK_THRESHOLD = 0.62;
export const ATLAS_DARK_LIGHTNESS_LIFT = 0.045;

export type AtlasDisplayColourOptions = {
  chromaScale?: number;
  paperMix?: number;
  darkThreshold?: number;
  darkLightnessLift?: number;
  paperHex?: string;
};

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase() as `#${string}`;
}

/**
 * Produces the softer colour used to print an Atlas sector. This colour is
 * presentation-only and must never be used for taxonomy matching.
 */
export function getAtlasDisplayColour(
  sector: SunsetColourSector,
  options: AtlasDisplayColourOptions = {},
) {
  const chromaScale = options.chromaScale ?? ATLAS_CHROMA_SCALE;
  const paperMix = clampUnit(options.paperMix ?? ATLAS_PAPER_MIX);
  const darkThreshold = options.darkThreshold ?? ATLAS_DARK_THRESHOLD;
  const darkLightnessLift =
    options.darkLightnessLift ?? ATLAS_DARK_LIGHTNESS_LIFT;
  const hueRadians = (sector.representativeOklch.h * Math.PI) / 180;
  const lightness =
    sector.representativeOklch.l < darkThreshold
      ? sector.representativeOklch.l + darkLightnessLift
      : sector.representativeOklch.l;
  const chroma = sector.representativeOklch.c * chromaScale;
  const softened = {
    l: lightness,
    a: chroma * Math.cos(hueRadians),
    b: chroma * Math.sin(hueRadians),
  };
  const paper = rgbToOklab(hexToRgb(options.paperHex ?? ATLAS_PAPER_HEX));
  const mixed = {
    l: softened.l * (1 - paperMix) + paper.l * paperMix,
    a: softened.a * (1 - paperMix) + paper.a * paperMix,
    b: softened.b * (1 - paperMix) + paper.b * paperMix,
  };

  return rgbToHex(oklabToRgb(mixed));
}

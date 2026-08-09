import type { SunsetColourSector } from "@/domain/sunset-colour";
import {
  hexToRgb,
  normalizeHex,
  rgbToOklch,
} from "@/lib/colour-analysis/colour-space";

type SectorDefinition = {
  name: string;
  family: string;
  hex: string;
};

export const SUNSET_COLOUR_TAXONOMY_VERSION = "1.0.0";

/**
 * An authored sunset-and-twilight sequence, not a generic hue wheel.
 *
 * Editing names, families, or representative colours here does not require
 * changes to the radial instrument or colour-matching logic.
 */
const SECTOR_DEFINITIONS: readonly SectorDefinition[] = [
  { name: "First Light Yellow", family: "Pale yellow", hex: "#FFF4BA" },
  { name: "Veiled Primrose", family: "Pale yellow", hex: "#FCEAA0" },
  { name: "Sunlit Straw", family: "Pale yellow", hex: "#F9DE82" },
  { name: "Early Gilt", family: "Golden yellow", hex: "#F6D36A" },
  { name: "Harvest Glow", family: "Golden yellow", hex: "#F3C752" },
  { name: "Solar Gold", family: "Golden yellow", hex: "#EFBA3F" },
  { name: "Honeyed Light", family: "Warm gold", hex: "#ECAF35" },
  { name: "Burnished Gold", family: "Warm gold", hex: "#E8A12F" },
  { name: "Late Gold", family: "Warm gold", hex: "#E3932B" },
  { name: "Clear Amber", family: "Amber", hex: "#DF8628" },
  { name: "Deep Amber", family: "Amber", hex: "#DB7927" },
  { name: "Resin Amber", family: "Amber", hex: "#D96D28" },
  { name: "Apricot Flame", family: "Apricot", hex: "#E27A3B" },
  { name: "Soft Apricot", family: "Apricot", hex: "#E8884D" },
  { name: "Apricot Haze", family: "Apricot", hex: "#ED955D" },
  { name: "Open Orange", family: "Orange", hex: "#F08445" },
  { name: "Tangerine Sky", family: "Orange", hex: "#ED7435" },
  { name: "Ember Orange", family: "Orange", hex: "#E7642C" },
  { name: "Vermilion Light", family: "Vermilion", hex: "#DE5026" },
  { name: "Deep Vermilion", family: "Vermilion", hex: "#D94329" },
  { name: "Red-Orange Flare", family: "Red-orange", hex: "#D33C2E" },
  { name: "Afterglow Red", family: "Red-orange", hex: "#CC3634" },
  { name: "Burnished Coral", family: "Coral", hex: "#D94C4A" },
  { name: "Open Coral", family: "Coral", hex: "#E25F5B" },
  { name: "Cloud Coral", family: "Coral", hex: "#E8736D" },
  { name: "Warm Salmon", family: "Salmon", hex: "#EC807A" },
  { name: "Soft Salmon", family: "Salmon", hex: "#EE8D87" },
  { name: "Faded Salmon", family: "Salmon", hex: "#EF9A95" },
  { name: "Afterglow Rose", family: "Rose", hex: "#E98890" },
  { name: "Dusty Rose", family: "Rose", hex: "#E17788" },
  { name: "Deep Rose", family: "Rose", hex: "#D96782" },
  { name: "Warm Pink", family: "Pink", hex: "#DA7897" },
  { name: "Cloud Pink", family: "Pink", hex: "#D882A4" },
  { name: "Pale Dusk Pink", family: "Pink", hex: "#D58DB0" },
  { name: "Afterlight Magenta", family: "Magenta", hex: "#C55B9B" },
  { name: "Deep Magenta", family: "Magenta", hex: "#B94E98" },
  { name: "Warm Mauve", family: "Mauve", hex: "#A65F95" },
  { name: "Dust Mauve", family: "Mauve", hex: "#97698F" },
  { name: "Grey Mauve", family: "Mauve", hex: "#88728A" },
  { name: "Mauve Violet", family: "Violet", hex: "#78648D" },
  { name: "Twilight Violet", family: "Violet", hex: "#68578F" },
  { name: "Deep Violet", family: "Violet", hex: "#594B90" },
  { name: "Blue-Violet Haze", family: "Blue-violet", hex: "#4D4C8D" },
  { name: "Blue-Violet Dusk", family: "Blue-violet", hex: "#414E88" },
  { name: "Evening Indigo", family: "Indigo", hex: "#354E7E" },
  { name: "Deepening Indigo", family: "Indigo", hex: "#304E73" },
  { name: "First Twilight Blue", family: "Twilight blue", hex: "#3A5D77" },
  { name: "Open Twilight Blue", family: "Twilight blue", hex: "#4A6D84" },
  { name: "Fading Twilight Blue", family: "Twilight blue", hex: "#5E7F92" },
  { name: "Evening Pale Blue", family: "Pale blue", hex: "#7898A8" },
  { name: "Horizon Pale Blue", family: "Pale blue", hex: "#94AFB9" },
  { name: "Mist Blue", family: "Pale blue", hex: "#B1C5CB" },
  { name: "Blue Silver", family: "Silver-grey", hex: "#C4CDD0" },
  { name: "Quiet Silver", family: "Silver-grey", hex: "#D1D4D2" },
  { name: "Warm Ash", family: "Ash", hex: "#C5C2BC" },
  { name: "Rose Ash", family: "Ash", hex: "#BDB5B1" },
  {
    name: "Weathered Rose",
    family: "Desaturated rose",
    hex: "#C6AAA8",
  },
  {
    name: "Rose-Tinted Mist",
    family: "Desaturated rose",
    hex: "#D5B6AD",
  },
  { name: "Pale Peach Veil", family: "Pale peach", hex: "#E7C8B2" },
  { name: "Yellow Peach Light", family: "Pale peach", hex: "#F2DAB4" },
] as const;

function sectorId(index: number): string {
  return `sunset-sector-${String(index + 1).padStart(2, "0")}`;
}

export const SUNSET_COLOUR_TAXONOMY: readonly SunsetColourSector[] =
  SECTOR_DEFINITIONS.map((definition, index, definitions) => {
    const representativeHex = normalizeHex(
      definition.hex,
    ) as `#${string}`;
    const representativeRgb = hexToRgb(representativeHex);
    const previousIndex = (index - 1 + definitions.length) % definitions.length;
    const nextIndex = (index + 1) % definitions.length;

    return Object.freeze({
      id: sectorId(index),
      index,
      code: `S${String(index + 1).padStart(2, "0")}` as const,
      name: definition.name,
      family: definition.family,
      representativeHex,
      representativeRgb: Object.freeze(representativeRgb),
      representativeOklch: Object.freeze(rgbToOklch(representativeRgb)),
      chromaticAngle: index * (360 / definitions.length),
      neighbourIds: Object.freeze([
        sectorId(previousIndex),
        sectorId(nextIndex),
      ]) as readonly [string, string],
    });
  });

/**
 * Restrained perimeter annotations. Codes remain canonical; these abbreviated
 * labels only help readers orient themselves within the full 60-sector scale.
 */
export const SUNSETOMETER_PERIMETER_LABELS = Object.freeze([
  { sectorId: sectorId(5), label: "Gold" },
  { sectorId: sectorId(11), label: "Amber" },
  { sectorId: sectorId(17), label: "Orange" },
  { sectorId: sectorId(23), label: "Coral" },
  { sectorId: sectorId(29), label: "Rose" },
  { sectorId: sectorId(35), label: "Magenta" },
  { sectorId: sectorId(41), label: "Violet" },
  { sectorId: sectorId(47), label: "Twilight" },
  { sectorId: sectorId(53), label: "Silver" },
  { sectorId: sectorId(59), label: "Pale peach" },
] as const);

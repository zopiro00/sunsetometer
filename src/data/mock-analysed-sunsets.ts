import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import { createInstrumentClassification } from "@/lib/colour-analysis";

export type MockAnalysedSunset = AnalysedSunset;

type MockDefinition = {
  displayName: string;
  date: string;
  location: string;
  sectorIndex: number;
  saturation: number;
  chroma: number;
  secondaryColourFamily?: string;
  minutesFromSunset?: number;
};

function imagePath(index: number): string {
  const extension = index === 17 || index === 18 ? "jpg" : "jpeg";
  return `/test-sunsets/sunset-${String(index).padStart(2, "0")}.${extension}`;
}

function createMockSunset(
  definition: MockDefinition,
  index: number,
): MockAnalysedSunset {
  const sector = SUNSET_COLOUR_TAXONOMY[definition.sectorIndex];
  const measured = {
    dominantColour: sector.representativeHex,
    hue: sector.representativeOklch.h,
    saturation: definition.saturation,
    chroma: definition.chroma,
    colourFamily: sector.family,
  };
  const skyColour = {
    hex: sector.representativeHex,
    rgb: sector.representativeRgb,
    oklch: sector.representativeOklch,
    hue: sector.representativeOklch.h,
    chroma: definition.chroma,
    lightness: sector.representativeOklch.l,
    confidence: 0.82,
  };

  return {
    id: `mock-sunset-${String(index + 1).padStart(2, "0")}`,
    originalFilename: imagePath(index + 1).split("/").at(-1) ?? "demo-sunset",
    displayName: definition.displayName,
    nameSource: "generated",
    image: imagePath(index + 1),
    date: definition.date,
    location: definition.location,
    ...measured,
    secondaryColourFamily: definition.secondaryColourFamily,
    minutesFromSunset: definition.minutesFromSunset,
    classification: createInstrumentClassification(measured),
    skyAnalysis: {
      region: { x: 0, y: 0, width: 1, height: 0.62 },
      primarySkyColour: skyColour,
      secondarySkyColours: [],
      averageSkyColour: skyColour,
      horizonColour: skyColour,
      upperSkyColour: skyColour,
    },
    source: "demo",
  };
}

/**
 * Development fixtures only. Chromatic values are authored to exercise the
 * instrument and are not measurements extracted from the source photographs.
 *
 * Several entries intentionally share a sector and chroma so their markers
 * overlap exactly, exercising focus and selected-state behavior.
 */
export const MOCK_ANALYSED_SUNSETS: readonly MockAnalysedSunset[] = [
  {
    displayName: "Golden Veil",
    date: "18 Jun 2025",
    location: "La Mancha, Spain",
    sectorIndex: 3,
    saturation: 0.48,
    chroma: 0.12,
    secondaryColourFamily: "Pale blue",
    minutesFromSunset: 8,
  },
  {
    displayName: "Harvest Horizon",
    date: "26 Jun 2025",
    location: "Toledo, Spain",
    sectorIndex: 5,
    saturation: 0.78,
    chroma: 0.18,
    secondaryColourFamily: "Amber",
    minutesFromSunset: -4,
  },
  {
    displayName: "Twin Gold",
    date: "27 Jun 2025",
    location: "Aranjuez, Spain",
    sectorIndex: 5,
    saturation: 0.78,
    chroma: 0.18,
  },
  {
    displayName: "Burnished Evening",
    date: "04 Jul 2025",
    location: "Cuenca, Spain",
    sectorIndex: 8,
    saturation: 0.72,
    chroma: 0.16,
  },
  {
    displayName: "Amber Descent",
    date: "12 Jul 2025",
    location: "Madrid, Spain",
    sectorIndex: 10,
    saturation: 0.83,
    chroma: 0.2,
    secondaryColourFamily: "Violet",
    minutesFromSunset: 12,
  },
  {
    displayName: "Apricot Air",
    date: "20 Jul 2025",
    location: "Segovia, Spain",
    sectorIndex: 14,
    saturation: 0.55,
    chroma: 0.11,
  },
  {
    displayName: "Orange Meridian",
    date: "03 Aug 2025",
    location: "Valencia, Spain",
    sectorIndex: 15,
    saturation: 0.87,
    chroma: 0.21,
    secondaryColourFamily: "Coral",
    minutesFromSunset: 16,
  },
  {
    displayName: "Tangerine Line",
    date: "09 Aug 2025",
    location: "Alicante, Spain",
    sectorIndex: 16,
    saturation: 0.94,
    chroma: 0.245,
  },
  {
    displayName: "Ember Weather",
    date: "17 Aug 2025",
    location: "Murcia, Spain",
    sectorIndex: 17,
    saturation: 0.89,
    chroma: 0.225,
  },
  {
    displayName: "Vermilion Fall",
    date: "22 Aug 2025",
    location: "Granada, Spain",
    sectorIndex: 18,
    saturation: 0.96,
    chroma: 0.26,
  },
  {
    displayName: "Coral Shelf",
    date: "31 Aug 2025",
    location: "Cádiz, Spain",
    sectorIndex: 22,
    saturation: 0.79,
    chroma: 0.19,
    secondaryColourFamily: "Violet",
    minutesFromSunset: 21,
  },
  {
    displayName: "Coral Echo",
    date: "01 Sep 2025",
    location: "Tarifa, Spain",
    sectorIndex: 23,
    saturation: 0.88,
    chroma: 0.22,
  },
  {
    displayName: "Second Coral",
    date: "02 Sep 2025",
    location: "Conil, Spain",
    sectorIndex: 23,
    saturation: 0.88,
    chroma: 0.22,
  },
  {
    displayName: "Salmon Cloud",
    date: "08 Sep 2025",
    location: "Málaga, Spain",
    sectorIndex: 26,
    saturation: 0.63,
    chroma: 0.135,
  },
  {
    displayName: "Rose Afterlight",
    date: "15 Sep 2025",
    location: "Lisbon, Portugal",
    sectorIndex: 28,
    saturation: 0.74,
    chroma: 0.17,
    secondaryColourFamily: "Mauve",
    minutesFromSunset: 27,
  },
  {
    displayName: "Dust Rose",
    date: "21 Sep 2025",
    location: "Porto, Portugal",
    sectorIndex: 29,
    saturation: 0.49,
    chroma: 0.09,
  },
  {
    displayName: "Deep Rose Band",
    date: "28 Sep 2025",
    location: "Galicia, Spain",
    sectorIndex: 30,
    saturation: 0.91,
    chroma: 0.235,
  },
  {
    displayName: "Pink Dissolve",
    date: "05 Oct 2025",
    location: "Asturias, Spain",
    sectorIndex: 32,
    saturation: 0.58,
    chroma: 0.12,
  },
  {
    displayName: "Mauve Quiet",
    date: "14 Oct 2025",
    location: "León, Spain",
    sectorIndex: 37,
    saturation: 0.37,
    chroma: 0.065,
  },
  {
    displayName: "Violet Threshold",
    date: "22 Oct 2025",
    location: "Burgos, Spain",
    sectorIndex: 40,
    saturation: 0.68,
    chroma: 0.15,
    secondaryColourFamily: "Rose",
    minutesFromSunset: 34,
  },
  {
    displayName: "Deep Violet Hour",
    date: "30 Oct 2025",
    location: "Soria, Spain",
    sectorIndex: 41,
    saturation: 0.86,
    chroma: 0.215,
  },
  {
    displayName: "Indigo Interval",
    date: "07 Nov 2025",
    location: "Pyrenees, Spain",
    sectorIndex: 44,
    saturation: 0.75,
    chroma: 0.18,
  },
  {
    displayName: "Twilight Pair I",
    date: "16 Nov 2025",
    location: "Bilbao, Spain",
    sectorIndex: 47,
    saturation: 0.31,
    chroma: 0.06,
    secondaryColourFamily: "Silver-grey",
    minutesFromSunset: 46,
  },
  {
    displayName: "Twilight Pair II",
    date: "17 Nov 2025",
    location: "San Sebastián, Spain",
    sectorIndex: 47,
    saturation: 0.31,
    chroma: 0.06,
  },
].map(createMockSunset);

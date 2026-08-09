import type { AnalysedSunset } from "@/domain/analysed-sunset";
import {
  createInstrumentClassification,
  findNearestSector,
} from "@/lib/colour-analysis";
import {
  hexToRgb,
  rgbToOklch,
} from "@/lib/colour-analysis/colour-space";

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

type MeasuredSkyFixture = {
  region: { x: number; y: number; width: number; height: number };
  primary: `#${string}`;
  secondary: `#${string}`;
  average: `#${string}`;
  horizon: `#${string}`;
  upper: `#${string}`;
  confidence: number;
};

/**
 * Measurements from the real demo photographs. Each region was selected to
 * contain sky (or, for sunset-08, the sunlit water specimen) and avoid the
 * foreground. Values are produced by the same OKLab clustering used for new
 * device photographs; no instrument coordinates are authored here.
 */
const MEASURED_SKY_FIXTURES: readonly MeasuredSkyFixture[] = [
  { region: { x: .35, y: .25, width: .65, height: .3 }, primary: "#EBC27D", secondary: "#C5B599", average: "#B5A080", horizon: "#AE8854", upper: "#AAA59B", confidence: .2579 },
  { region: { x: .25, y: .05, width: .75, height: .45 }, primary: "#6594CD", secondary: "#8FB7DC", average: "#8FB1D0", horizon: "#B6C5BC", upper: "#749CD0", confidence: .3381 },
  { region: { x: 0, y: .55, width: .78, height: .36 }, primary: "#AF4418", secondary: "#6D432D", average: "#5A423A", horizon: "#7B4426", upper: "#353F4B", confidence: .1629 },
  { region: { x: 0, y: .05, width: 1, height: .4 }, primary: "#E0C39F", secondary: "#BEAEA0", average: "#B5A598", horizon: "#AB8E72", upper: "#9FA2AB", confidence: .2992 },
  { region: { x: .1, y: 0, width: .75, height: .38 }, primary: "#FBBF78", secondary: "#8CADCF", average: "#B0AAAC", horizon: "#C9B099", upper: "#82A6CB", confidence: .1184 },
  { region: { x: 0, y: 0, width: .4, height: .45 }, primary: "#88A5BD", secondary: "#CCBBA8", average: "#96A3A9", horizon: "#9F9488", upper: "#85A4BD", confidence: .4033 },
  { region: { x: 0, y: .48, width: 1, height: .32 }, primary: "#DF8A58", secondary: "#99756A", average: "#B39C93", horizon: "#C58560", upper: "#A2AFBD", confidence: .1798 },
  { region: { x: .35, y: 0, width: .4, height: .3 }, primary: "#DBD1B8", secondary: "#B2AD9F", average: "#D1CCBD", horizon: "#B7B5A8", upper: "#D5D1C1", confidence: .3038 },
  { region: { x: 0, y: .18, width: 1, height: .45 }, primary: "#EEB96F", secondary: "#C2AA90", average: "#BDA283", horizon: "#D7AB6A", upper: "#9A918C", confidence: .3195 },
  { region: { x: 0, y: 0, width: 1, height: .48 }, primary: "#4A6484", secondary: "#677E99", average: "#8091A3", horizon: "#A7B2B5", upper: "#586C89", confidence: .2551 },
  { region: { x: 0, y: 0, width: 1, height: .48 }, primary: "#5E8EC7", secondary: "#80AED8", average: "#80A8CF", horizon: "#A5C5CD", upper: "#6690C6", confidence: .4405 },
  { region: { x: 0, y: 0, width: 1, height: .48 }, primary: "#608DC1", secondary: "#87AED0", average: "#88A8C5", horizon: "#AEBBB1", upper: "#6E95C4", confidence: .3775 },
  { region: { x: 0, y: .55, width: 1, height: .18 }, primary: "#8E9BAF", secondary: "#778192", average: "#80808A", horizon: "#958584", upper: "#717D91", confidence: .3022 },
  { region: { x: 0, y: 0, width: 1, height: .45 }, primary: "#D6BD9F", secondary: "#8790A2", average: "#AAA3A1", horizon: "#C9B094", upper: "#858EA1", confidence: .2602 },
  { region: { x: .48, y: 0, width: .52, height: .38 }, primary: "#F7EDB4", secondary: "#D3C4AF", average: "#ADA494", horizon: "#D0B88E", upper: "#88898B", confidence: .0998 },
  { region: { x: 0, y: .25, width: 1, height: .35 }, primary: "#F69F42", secondary: "#E6B97D", average: "#8C7D64", horizon: "#393617", upper: "#909498", confidence: .1649 },
  { region: { x: .25, y: .2, width: .7, height: .28 }, primary: "#A8916B", secondary: "#D9CA9D", average: "#AC9770", horizon: "#968359", upper: "#9F8865", confidence: .5957 },
  { region: { x: .25, y: .2, width: .7, height: .28 }, primary: "#BA9F73", secondary: "#9D8764", average: "#B29B73", horizon: "#BCA576", upper: "#A18C67", confidence: .3599 },
  { region: { x: 0, y: 0, width: 1, height: .43 }, primary: "#7189A0", secondary: "#CDBD9F", average: "#A0A49F", horizon: "#9E8F6C", upper: "#879AB1", confidence: .2079 },
  { region: { x: .12, y: 0, width: .67, height: .53 }, primary: "#7DA3D1", secondary: "#A5BED6", average: "#96ACC3", horizon: "#C1BAAC", upper: "#7796C2", confidence: .4305 },
  { region: { x: 0, y: .25, width: 1, height: .3 }, primary: "#EACEA1", secondary: "#E29F70", average: "#CAB49C", horizon: "#C8946B", upper: "#B6B9B9", confidence: .2226 },
  { region: { x: .2, y: 0, width: .6, height: .4 }, primary: "#DCD3C4", secondary: "#CFBBA5", average: "#D4C8B6", horizon: "#CDB092", upper: "#CCCCC9", confidence: .4429 },
  { region: { x: 0, y: 0, width: 1, height: .45 }, primary: "#E5C39B", secondary: "#BDB0A7", average: "#B2A8A3", horizon: "#D5B591", upper: "#9297A6", confidence: .304 },
  { region: { x: 0, y: 0, width: 1, height: .45 }, primary: "#E5C398", secondary: "#BCAFA4", average: "#B3A8A1", horizon: "#D6B58F", upper: "#9296A3", confidence: .3075 },
];

function hslSaturation(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => channel / 255);
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const lightness = (maximum + minimum) / 2;

  return maximum === minimum
    ? 0
    : (maximum - minimum) / (1 - Math.abs(2 * lightness - 1));
}

function colourMeasurement(hex: `#${string}`, confidence: number) {
  const rgb = hexToRgb(hex);
  const oklch = rgbToOklch(rgb);

  return {
    hex,
    rgb,
    oklch,
    hue: oklch.h,
    chroma: oklch.c,
    lightness: oklch.l,
    confidence,
  };
}

function imagePath(index: number): string {
  const extension = index === 17 || index === 18 ? "jpg" : "jpeg";
  return `/test-sunsets/sunset-${String(index).padStart(2, "0")}.${extension}`;
}

function createMockSunset(
  definition: MockDefinition,
  index: number,
): MockAnalysedSunset {
  const analysis = MEASURED_SKY_FIXTURES[index];
  const primarySkyColour = colourMeasurement(
    analysis.primary,
    analysis.confidence,
  );
  const secondarySkyColour = colourMeasurement(analysis.secondary, 0.5);
  const sector = findNearestSector(primarySkyColour.hex);
  const measured = {
    dominantColour: primarySkyColour.hex,
    hue: primarySkyColour.hue,
    saturation: hslSaturation(primarySkyColour.hex),
    chroma: primarySkyColour.chroma,
    colourFamily: sector.family,
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
    secondaryColourFamily: findNearestSector(secondarySkyColour.hex).family,
    minutesFromSunset: definition.minutesFromSunset,
    classification: createInstrumentClassification(measured),
    skyAnalysis: {
      region: analysis.region,
      primarySkyColour,
      secondarySkyColours: [secondarySkyColour],
      averageSkyColour: colourMeasurement(analysis.average, 1),
      horizonColour: colourMeasurement(analysis.horizon, 1),
      upperSkyColour: colourMeasurement(analysis.upper, 1),
    },
    source: "demo",
  };
}

/**
 * Development fixtures only. Metadata and names are illustrative, while the
 * chromatic values above are measurements extracted from the source images.
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

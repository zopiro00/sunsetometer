import type {
  AnalysedSunset,
  SkyAnalysisDebug,
  SkyAnalysisResult,
  SkyClusterDebug,
  SkyColourMeasurement,
  SkyRegion,
} from "@/domain/analysed-sunset";
import type { RgbColour } from "@/domain/sunset-colour";
import { createInstrumentClassification } from "@/lib/colour-analysis/instrument-classification";
import {
  normalizeRgb,
  oklabToRgb,
  rgbToOklab,
  rgbToOklch,
  type OklabColour,
} from "@/lib/colour-analysis/colour-space";
import { findNearestSector } from "@/lib/colour-analysis/sunset-taxonomy";
import { generateProvisionalSunsetName } from "@/lib/sunset-name";

type AnalysedPixel = {
  rgb: RgbColour;
  lab: OklabColour;
  chroma: number;
  y: number;
};

type Cluster = {
  centre: OklabColour;
  pixels: AnalysedPixel[];
  score: number;
};

export type SkyPixelAnalysis = Omit<SkyAnalysisResult, "region" | "debug"> & {
  debug: Omit<SkyAnalysisDebug, "cropDataUrl" | "exclusionsDataUrl"> & {
    excludedMask: Uint8Array;
  };
};

const MAX_CLUSTERS = 5;
const K_MEANS_ITERATIONS = 12;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rgbToHex(colour: RgbColour): `#${string}` {
  const { r, g, b } = normalizeRgb(colour);
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function labDistance(first: OklabColour, second: OklabColour): number {
  return Math.hypot(
    first.l - second.l,
    first.a - second.a,
    first.b - second.b,
  );
}

function averageLab(pixels: readonly AnalysedPixel[]): OklabColour {
  if (pixels.length === 0) {
    throw new Error("Cannot average an empty sky-pixel collection");
  }

  const total = pixels.reduce(
    (sum, pixel) => ({
      l: sum.l + pixel.lab.l,
      a: sum.a + pixel.lab.a,
      b: sum.b + pixel.lab.b,
    }),
    { l: 0, a: 0, b: 0 },
  );

  return {
    l: total.l / pixels.length,
    a: total.a / pixels.length,
    b: total.b / pixels.length,
  };
}

function measurementFromLab(
  lab: OklabColour,
  confidence: number,
): SkyColourMeasurement {
  const rgb = oklabToRgb(lab);
  const oklch = rgbToOklch(rgb);

  return {
    hex: rgbToHex(rgb),
    rgb,
    oklch,
    hue: oklch.h,
    chroma: oklch.c,
    lightness: oklch.l,
    confidence: Number(clamp(confidence).toFixed(4)),
  };
}

function isForegroundContamination(
  rgb: RgbColour,
  lab: OklabColour,
  chroma: number,
  alpha: number,
): boolean {
  const maximum = Math.max(rgb.r, rgb.g, rgb.b);

  return (
    alpha < 192 ||
    maximum < 28 ||
    lab.l < 0.18 ||
    (lab.l < 0.3 && chroma < 0.045)
  );
}

function chooseInitialCentres(
  pixels: readonly AnalysedPixel[],
  count: number,
): OklabColour[] {
  const mean = averageLab(pixels);
  const first = pixels.reduce((closest, pixel) =>
    labDistance(pixel.lab, mean) < labDistance(closest.lab, mean)
      ? pixel
      : closest,
  );
  const centres = [first.lab];

  while (centres.length < count) {
    const next = pixels.reduce((farthest, pixel) => {
      const distance = Math.min(
        ...centres.map((centre) => labDistance(pixel.lab, centre)),
      );
      return distance > farthest.distance ? { pixel, distance } : farthest;
    }, { pixel: pixels[0], distance: -1 });

    if (next.distance < 0.012) {
      break;
    }

    centres.push(next.pixel.lab);
  }

  return centres.map((centre) => ({ ...centre }));
}

function clusterSkyPixels(pixels: readonly AnalysedPixel[]): Cluster[] {
  const desiredClusterCount = Math.min(
    MAX_CLUSTERS,
    Math.max(1, Math.round(Math.sqrt(pixels.length / 180))),
  );
  let centres = chooseInitialCentres(pixels, desiredClusterCount);
  let assignments: AnalysedPixel[][] = [];

  for (let iteration = 0; iteration < K_MEANS_ITERATIONS; iteration += 1) {
    assignments = centres.map(() => []);

    for (const pixel of pixels) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      centres.forEach((centre, index) => {
        const distance = labDistance(pixel.lab, centre);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      assignments[nearestIndex].push(pixel);
    }

    const populated = assignments
      .map((clusterPixels, index) => ({
        centre: centres[index],
        pixels: clusterPixels,
      }))
      .filter(({ pixels: clusterPixels }) => clusterPixels.length > 0);
    const nextCentres = populated.map(({ pixels: clusterPixels }) =>
      averageLab(clusterPixels),
    );
    const movement = Math.max(
      0,
      ...nextCentres.map((centre, index) =>
        labDistance(centre, populated[index].centre),
      ),
    );

    centres = nextCentres;

    if (movement < 0.0005) {
      assignments = populated.map(({ pixels: clusterPixels }) => clusterPixels);
      break;
    }
  }

  return assignments
    .filter((clusterPixels) => clusterPixels.length > 0)
    .map((clusterPixels) => {
      const centre = averageLab(clusterPixels);
      const chroma = Math.hypot(centre.a, centre.b);
      const populationShare = clusterPixels.length / pixels.length;
      const chromaticWeight = 0.78 + 0.22 * clamp(chroma / 0.18);
      const lightnessWeight =
        centre.l < 0.35 ? 0.78 + centre.l * 0.6 : 1;

      return {
        centre,
        pixels: clusterPixels,
        score: populationShare * chromaticWeight * lightnessWeight,
      };
    })
    .sort((first, second) => second.score - first.score);
}

function regionMeasurement(
  pixels: readonly AnalysedPixel[],
  fallback: readonly AnalysedPixel[],
): SkyColourMeasurement {
  const source = pixels.length > 0 ? pixels : fallback;
  return measurementFromLab(averageLab(source), source.length / fallback.length);
}

/**
 * Finds the primary colour of an explicitly selected sky crop.
 *
 * Pixels are converted to OKLab, near-black and low-light neutral foreground
 * contamination is excluded, and the remaining colours are grouped with
 * deterministic k-means clustering. The primary cluster maximises population
 * share with a modest chroma preference, so a tiny saturated patch cannot
 * outweigh the visually representative body of sky.
 */
export function analyseSkyPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): SkyPixelAnalysis {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.length !== width * height * 4
  ) {
    throw new Error("Sky pixel data must match positive image dimensions");
  }

  const included: AnalysedPixel[] = [];
  const excludedMask = new Uint8Array(width * height);

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const rgb = {
      r: pixels[dataIndex],
      g: pixels[dataIndex + 1],
      b: pixels[dataIndex + 2],
    };
    const alpha = pixels[dataIndex + 3];
    const lab = rgbToOklab(rgb);
    const chroma = Math.hypot(lab.a, lab.b);

    if (isForegroundContamination(rgb, lab, chroma, alpha)) {
      excludedMask[pixelIndex] = 1;
      continue;
    }

    included.push({
      rgb,
      lab,
      chroma,
      y: Math.floor(pixelIndex / width) / Math.max(1, height - 1),
    });
  }

  if (included.length < Math.max(4, width * height * 0.02)) {
    throw new Error(
      "The selected region does not contain enough visible sky pixels",
    );
  }

  const clusters = clusterSkyPixels(included);
  const primary = clusters[0];
  const primaryShare = primary.pixels.length / included.length;
  const nextScore = clusters[1]?.score ?? 0;
  const scoreSeparation =
    primary.score === 0 ? 0 : (primary.score - nextScore) / primary.score;
  const primaryConfidence = clamp(
    primaryShare * 0.72 + scoreSeparation * 0.28,
  );
  const primarySkyColour = measurementFromLab(
    primary.centre,
    primaryConfidence,
  );
  const secondarySkyColours = clusters
    .slice(1, 3)
    .map((cluster) =>
      measurementFromLab(
        cluster.centre,
        cluster.pixels.length / included.length,
      ),
    );
  const upperPixels = included.filter((pixel) => pixel.y <= 0.28);
  const horizonPixels = included.filter((pixel) => pixel.y >= 0.72);
  const debugClusters: SkyClusterDebug[] = clusters.map((cluster, index) => ({
    colour: measurementFromLab(cluster.centre, 1).hex,
    pixelCount: cluster.pixels.length,
    populationShare: Number(
      (cluster.pixels.length / included.length).toFixed(4),
    ),
    score: Number(cluster.score.toFixed(4)),
    isPrimary: index === 0,
  }));

  return {
    primarySkyColour,
    secondarySkyColours,
    averageSkyColour: regionMeasurement(included, included),
    horizonColour: regionMeasurement(horizonPixels, included),
    upperSkyColour: regionMeasurement(upperPixels, included),
    debug: {
      totalPixels: width * height,
      includedPixels: included.length,
      excludedPixels: width * height - included.length,
      excludedMask,
      clusters: debugClusters,
    },
  };
}

function validateSkyRegion(region: SkyRegion): void {
  const values = [region.x, region.y, region.width, region.height];

  if (
    values.some((value) => !Number.isFinite(value)) ||
    region.x < 0 ||
    region.y < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.x + region.width > 1.000001 ||
    region.y + region.height > 1.000001
  ) {
    throw new Error("Select a valid sky region before analysis");
  }
}

function debugExclusionsDataUrl(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  excludedMask: Uint8Array,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  const debugPixels = new Uint8ClampedArray(pixels);

  excludedMask.forEach((isExcluded, pixelIndex) => {
    if (!isExcluded) {
      return;
    }

    const index = pixelIndex * 4;
    const luminance =
      debugPixels[index] * 0.2126 +
      debugPixels[index + 1] * 0.7152 +
      debugPixels[index + 2] * 0.0722;
    debugPixels[index] = Math.round(luminance * 0.55 + 110);
    debugPixels[index + 1] = Math.round(luminance * 0.35);
    debugPixels[index + 2] = Math.round(luminance * 0.35);
    debugPixels[index + 3] = 255;
  });

  context.putImageData(new ImageData(debugPixels, width, height), 0, 0);
  return canvas.toDataURL("image/png");
}

function photographDate(lastModified: number): string {
  if (!lastModified) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(lastModified));
}

export async function analyseSunsetFile(
  file: File,
  region: SkyRegion,
  imageUrl: string,
  includeDebug = false,
): Promise<AnalysedSunset> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file to analyse");
  }

  validateSkyRegion(region);
  const bitmap = await createImageBitmap(file);
  const sourceX = Math.round(region.x * bitmap.width);
  const sourceY = Math.round(region.y * bitmap.height);
  const sourceWidth = Math.max(1, Math.round(region.width * bitmap.width));
  const sourceHeight = Math.max(1, Math.round(region.height * bitmap.height));
  const scale = Math.min(1, 280 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot analyse the photograph");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
  bitmap.close();
  const imageData = context.getImageData(0, 0, width, height);
  const skyPixels = analyseSkyPixels(imageData.data, width, height);
  const primary = skyPixels.primarySkyColour;
  const classification = createInstrumentClassification({
    dominantColour: primary.hex,
    hue: primary.hue,
    saturation: clamp(primary.chroma / 0.25),
    chroma: primary.chroma,
    colourFamily: "Pending classification",
  });
  const secondaryColourFamily = skyPixels.secondarySkyColours[0]
    ? findNearestSector(skyPixels.secondarySkyColours[0].hex).family
    : undefined;
  const displayName = generateProvisionalSunsetName({
    primaryColourFamily: classification.colourFamily,
    secondaryColourFamily,
    chroma: primary.chroma,
    hue: primary.hue,
    sectorCode: classification.sectorId,
  });
  const debug: SkyAnalysisDebug | undefined = includeDebug
    ? {
        cropDataUrl: canvas.toDataURL("image/jpeg", 0.86),
        exclusionsDataUrl: debugExclusionsDataUrl(
          imageData.data,
          width,
          height,
          skyPixels.debug.excludedMask,
        ),
        totalPixels: skyPixels.debug.totalPixels,
        includedPixels: skyPixels.debug.includedPixels,
        excludedPixels: skyPixels.debug.excludedPixels,
        clusters: skyPixels.debug.clusters,
      }
    : undefined;
  const skyAnalysis: SkyAnalysisResult = {
    region,
    primarySkyColour: primary,
    secondarySkyColours: skyPixels.secondarySkyColours,
    averageSkyColour: skyPixels.averageSkyColour,
    horizonColour: skyPixels.horizonColour,
    upperSkyColour: skyPixels.upperSkyColour,
    debug,
  };

  return {
    id: `device-${crypto.randomUUID()}`,
    originalFilename: file.name,
    displayName,
    nameSource: "generated",
    image: imageUrl,
    date: photographDate(file.lastModified),
    location: "Location unavailable",
    dominantColour: primary.hex,
    hue: primary.hue,
    saturation: clamp(primary.chroma / 0.25),
    chroma: primary.chroma,
    colourFamily: classification.colourFamily,
    secondaryColourFamily,
    classification,
    skyAnalysis,
    source: "device-analysis",
  };
}

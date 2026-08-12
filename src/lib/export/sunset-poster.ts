import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { drawAtlasPosterTemplate } from "@/lib/export/templates/poster-atlas-template";
import { drawCircularPosterTemplate } from "@/lib/export/templates/poster-circular-template";
import { drawPostcardBackTemplate } from "@/lib/export/templates/postcard-back-template";
import { drawPostcardFrontTemplate } from "@/lib/export/templates/postcard-front-template";
import type { ExportAtmosphereEvidence, PdfTemplateContext } from "@/lib/export/templates/types";
import { resolveSunsetExportTemplates } from "@/lib/export/resolve-export-templates";

export type SunsetExportOptions = {
  layout: "circular" | "atlas";
  orientation: "portrait" | "landscape";
  format: "poster" | "postcard";
  sides: "front" | "front-back";
  density: "minimal" | "standard" | "detailed";
  paperSize: "a4" | "a3" | "letter";
};

export const DEFAULT_SUNSET_EXPORT_OPTIONS: SunsetExportOptions = {
  layout: "circular",
  orientation: "portrait",
  format: "poster",
  sides: "front",
  density: "standard",
  paperSize: "a4",
};

function safeFilename(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "sunset";
}

export function buildSunsetExportFilename(
  displayName: string,
  options: SunsetExportOptions,
): string {
  const layout = options.layout === "circular" ? "circular" : "atlas";
  const sides = options.sides === "front-back" ? "-front-back" : "";
  return `${safeFilename(displayName)}-${layout}-${options.format}${sides}.pdf`;
}

async function createPosterImage(imageUrl: string, options: SunsetExportOptions): Promise<string> {
  const image = new Image();
  image.decoding = "async";
  image.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The sunset image could not be prepared for export."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = options.paperSize === "a3" ? 4000 : 3200;
  canvas.height = Math.round(canvas.width * 0.625);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the export image.");
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.94);
}

export async function downloadSunsetPoster(
  sunset: AnalysedSunset,
  options: SunsetExportOptions = DEFAULT_SUNSET_EXPORT_OPTIONS,
  atmosphere?: ExportAtmosphereEvidence,
): Promise<void> {
  const [{ jsPDF }, imageData] = await Promise.all([import("jspdf"), createPosterImage(sunset.image, options)]);
  const pdf = new jsPDF({ compress: true, floatPrecision: 16, format: options.paperSize, orientation: options.orientation, unit: "mm" });
  const context: PdfTemplateContext = { atmosphere, imageData, options, pdf, sunset };

  resolveSunsetExportTemplates(options).forEach((templateId, index) => {
    if (index > 0) pdf.addPage(options.paperSize, options.orientation);
    if (templateId === "poster-circular") drawCircularPosterTemplate(context);
    if (templateId === "poster-atlas") drawAtlasPosterTemplate(context);
    if (templateId === "postcard-front") drawPostcardFrontTemplate(context);
    if (templateId === "postcard-back") {
      drawPostcardBackTemplate(context, options.format === "postcard" ? "POSTCARD / BACK" : "POSTER / REVERSE");
    }
  });

  pdf.save(buildSunsetExportFilename(sunset.displayName, options));
}

import type { jsPDF } from "jspdf";

import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { selectExportContent } from "@/lib/export/export-content-rules";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

export const PAPER = [243, 237, 223] as const;
export const INK = [36, 24, 19] as const;
export const EMBER = [173, 69, 42] as const;

export function pageMetrics(pdf: jsPDF) {
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  return { width, height, margin: Math.max(14, Math.min(width, height) * 0.07) };
}

export function drawFoundation(pdf: jsPDF, label: string, topInset = 0) {
  const { width, height, margin } = pageMetrics(pdf);
  pdf.setFillColor(...PAPER);
  pdf.rect(0, 0, width, height, "F");
  pdf.setDrawColor(85, 65, 54);
  pdf.setLineWidth(0.25);
  pdf.line(margin, 14 + topInset, width - margin, 14 + topInset);
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setCharSpace(1.1);
  pdf.text(`SUNSETOMETER / ${label}`, margin, 10 + topInset);
  pdf.setCharSpace(0);
  return { width, height, margin };
}

export function drawFooter(pdf: jsPDF, sunset: AnalysedSunset) {
  const { width, height, margin } = pageMetrics(pdf);
  pdf.setDrawColor(85, 65, 54);
  pdf.line(margin, height - 25, width - margin, height - 25);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(90, 77, 69);
  pdf.text("sunsetometer.com", margin, height - 9);
  pdf.text(sunset.classification.sectorId, width - margin, height - 9, { align: "right" });
}

function rgb(hex: string): readonly [number, number, number] {
  const value = hex.replace("#", "");
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
}

function selectedSectorIndex(sunset: AnalysedSunset): number {
  const index = Number.parseInt(sunset.classification.sectorId.slice(1), 10) - 1;
  return Number.isFinite(index) ? Math.max(0, Math.min(SUNSET_COLOUR_TAXONOMY.length - 1, index)) : 0;
}

function drawImageInAperture(
  pdf: jsPDF,
  imageData: string,
  centreX: number,
  centreY: number,
  radius: number,
) {
  pdf.discardPath();
  pdf.saveGraphicsState();
  pdf.circle(centreX, centreY, radius, null);
  pdf.clip();
  pdf.discardPath();
  const imageWidth = radius * 3.2;
  const imageHeight = radius * 2;
  pdf.addImage(imageData, "JPEG", centreX - imageWidth / 2, centreY - imageHeight / 2, imageWidth, imageHeight);
  pdf.restoreGraphicsState();
  pdf.setDrawColor(255, 250, 240);
  pdf.setLineWidth(Math.max(0.5, radius * 0.025));
  pdf.circle(centreX, centreY, radius, "S");
}

export function drawCircularScale(
  context: PdfTemplateContext,
  centreX: number,
  centreY: number,
  outerRadius: number,
) {
  const { pdf, sunset, imageData } = context;
  const innerRadius = outerRadius * 0.55;
  const sectorAngle = 360 / SUNSET_COLOUR_TAXONOMY.length;

  SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
    const start = ((index * sectorAngle) - 90) * Math.PI / 180;
    const end = (((index + 1) * sectorAngle) - 90) * Math.PI / 180;
    pdf.setFillColor(...rgb(sector.representativeHex));
    pdf.triangle(
      centreX,
      centreY,
      centreX + Math.cos(start) * outerRadius,
      centreY + Math.sin(start) * outerRadius,
      centreX + Math.cos(end) * outerRadius,
      centreY + Math.sin(end) * outerRadius,
      "F",
    );
    pdf.setDrawColor(255, 250, 240);
    pdf.setLineWidth(0.12);
    pdf.line(
      centreX + Math.cos(start) * innerRadius,
      centreY + Math.sin(start) * innerRadius,
      centreX + Math.cos(start) * outerRadius,
      centreY + Math.sin(start) * outerRadius,
    );
  });

  drawImageInAperture(pdf, imageData, centreX, centreY, innerRadius);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.35);
  pdf.circle(centreX, centreY, outerRadius, "S");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(Math.max(4.5, outerRadius * 0.045));
  pdf.setTextColor(...INK);
  SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
    if (index % 5 !== 0) return;
    const angle = ((index * sectorAngle) - 87) * Math.PI / 180;
    pdf.text(
      sector.code,
      centreX + Math.cos(angle) * (outerRadius + Math.max(4, outerRadius * 0.07)),
      centreY + Math.sin(angle) * (outerRadius + Math.max(4, outerRadius * 0.07)) + 1.5,
      { align: "center" },
    );
  });

  const selectedAngle = ((selectedSectorIndex(sunset) + 0.5) * sectorAngle - 90) * Math.PI / 180;
  const markerRadius = innerRadius + (outerRadius - innerRadius) * Math.max(0.12, sunset.classification.radialPosition);
  const markerX = centreX + Math.cos(selectedAngle) * markerRadius;
  const markerY = centreY + Math.sin(selectedAngle) * markerRadius;
  pdf.setFillColor(255, 250, 240);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.55);
  pdf.circle(markerX, markerY, Math.max(1.5, outerRadius * 0.018), "FD");
}

function perimeterPoint(x: number, y: number, width: number, height: number, progress: number) {
  const perimeter = 2 * (width + height);
  let distance = ((progress % 1) + 1) % 1 * perimeter;
  if (distance <= width) return { x: x + distance, y };
  distance -= width;
  if (distance <= height) return { x: x + width, y: y + distance };
  distance -= height;
  if (distance <= width) return { x: x + width - distance, y: y + height };
  distance -= width;
  return { x, y: y + height - distance };
}

export type PrintAtlasInstrumentOptions = {
  apertureRadiusRatio?: number;
  apertureXRatio?: number;
  apertureYRatio?: number;
  showPerimeterNumbers?: boolean;
};

function pointBeyondAperture(
  centreX: number,
  centreY: number,
  targetX: number,
  targetY: number,
  apertureRadius: number,
  progress: number,
) {
  const deltaX = targetX - centreX;
  const deltaY = targetY - centreY;
  const distance = Math.hypot(deltaX, deltaY);
  const apertureProgress = distance === 0 ? 0 : apertureRadius / distance;
  const adjustedProgress = apertureProgress + Math.max(0, Math.min(1, progress)) * (1 - apertureProgress);
  return {
    x: centreX + deltaX * adjustedProgress,
    y: centreY + deltaY * adjustedProgress,
  };
}

export function drawPrintAtlasInstrument(
  context: PdfTemplateContext,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PrintAtlasInstrumentOptions = {},
) {
  const { pdf, sunset, imageData } = context;
  const centreX = x + width * (options.apertureXRatio ?? 0.64);
  const centreY = y + height * (options.apertureYRatio ?? 0.5);
  const apertureRadius = Math.min(width, height) * (options.apertureRadiusRatio ?? 0.24);

  SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
    const start = perimeterPoint(x, y, width, height, index / SUNSET_COLOUR_TAXONOMY.length);
    const end = perimeterPoint(x, y, width, height, (index + 1) / SUNSET_COLOUR_TAXONOMY.length);
    pdf.setFillColor(...rgb(sector.representativeHex));
    pdf.triangle(centreX, centreY, start.x, start.y, end.x, end.y, "F");
    pdf.setDrawColor(255, 250, 240);
    pdf.setLineWidth(0.12);
    pdf.line(centreX, centreY, start.x, start.y);
  });

  drawImageInAperture(pdf, imageData, centreX, centreY, apertureRadius);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.35);
  pdf.rect(x, y, width, height, "S");

  if (options.showPerimeterNumbers !== false) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(Math.max(4.5, Math.min(width, height) * 0.018));
    pdf.setTextColor(...INK);
    SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
      if (index % 5 !== 0) return;
      const point = perimeterPoint(x, y, width, height, (index + 0.5) / SUNSET_COLOUR_TAXONOMY.length);
      const labelX = point.x <= x + 0.5 ? point.x - 3 : point.x >= x + width - 0.5 ? point.x + 3 : point.x;
      const labelY = point.y <= y + 0.5 ? point.y - 2.5 : point.y >= y + height - 0.5 ? point.y + 4.5 : point.y + 1.5;
      pdf.text(sector.code, labelX, labelY, { align: point.x <= x + 0.5 ? "right" : point.x >= x + width - 0.5 ? "left" : "center" });
    });
  }

  const selectedIndex = selectedSectorIndex(sunset);
  const selectedStart = perimeterPoint(x, y, width, height, selectedIndex / SUNSET_COLOUR_TAXONOMY.length);
  const selectedEnd = perimeterPoint(x, y, width, height, (selectedIndex + 1) / SUNSET_COLOUR_TAXONOMY.length);
  const selectedStartAtAperture = pointBeyondAperture(centreX, centreY, selectedStart.x, selectedStart.y, apertureRadius, 0);
  const selectedEndAtAperture = pointBeyondAperture(centreX, centreY, selectedEnd.x, selectedEnd.y, apertureRadius, 0);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.35);
  pdf.line(selectedStartAtAperture.x, selectedStartAtAperture.y, selectedStart.x, selectedStart.y);
  pdf.line(selectedEndAtAperture.x, selectedEndAtAperture.y, selectedEnd.x, selectedEnd.y);
  const selected = perimeterPoint(
    x,
    y,
    width,
    height,
    (selectedIndex + 0.5) / SUNSET_COLOUR_TAXONOMY.length,
  );
  const marker = pointBeyondAperture(
    centreX,
    centreY,
    selected.x,
    selected.y,
    apertureRadius,
    sunset.classification.radialPosition,
  );
  pdf.setFillColor(255, 250, 240);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.55);
  pdf.circle(marker.x, marker.y, Math.max(1.5, Math.min(width, height) * 0.012), "FD");
}

export function solarTiming(sunset: AnalysedSunset): string | null {
  const minutes = sunset.minutesFromSunset;
  return minutes === undefined ? null : `${minutes >= 0 ? "+" : "-"}${Math.abs(minutes)} min ${minutes >= 0 ? "after" : "before"} sunset`;
}

export function densityLines(context: PdfTemplateContext): string[] {
  return [...selectExportContent({ ...context, surface: "poster" }).metrics];
}

export function posterInterpretation(context: PdfTemplateContext): string | undefined {
  return selectExportContent({ ...context, surface: "poster" }).interpretation;
}

export function drawIdentity(context: PdfTemplateContext, x: number, y: number, maxWidth: number, compact = false) {
  const { pdf, sunset } = context;
  pdf.setTextColor(...INK);
  pdf.setFont("times", "normal");
  pdf.setFontSize(compact ? 20 : 27);
  pdf.text(sunset.displayName, x, y, { maxWidth });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`${sunset.date} / ${sunset.location}`, x, y + 12, { maxWidth });
}

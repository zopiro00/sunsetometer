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

export function drawCircularScale(pdf: jsPDF, x: number, y: number, radius: number, sunset: AnalysedSunset) {
  const innerRadius = radius * 0.72;
  pdf.setLineWidth(Math.max(1.2, radius * 0.085));
  SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
    const angle = ((index * 6) - 90) * Math.PI / 180;
    pdf.setDrawColor(...rgb(sector.representativeHex));
    pdf.line(x + Math.cos(angle) * innerRadius, y + Math.sin(angle) * innerRadius, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  });
  pdf.setFillColor(...PAPER);
  pdf.circle(x, y, innerRadius - 1, "F");
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.3);
  pdf.circle(x, y, innerRadius - 1, "S");
  pdf.setFont("times", "normal");
  pdf.setFontSize(Math.max(10, radius * 0.44));
  pdf.setTextColor(...INK);
  pdf.text(sunset.classification.sectorId, x, y + 2, { align: "center" });
}

export function drawAtlasScale(pdf: jsPDF, x: number, y: number, width: number, height: number, sunset: AnalysedSunset) {
  const bandWidth = width / SUNSET_COLOUR_TAXONOMY.length;
  SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
    pdf.setFillColor(...rgb(sector.representativeHex));
    pdf.rect(x + index * bandWidth, y, bandWidth + 0.1, height, "F");
  });
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, height, "S");
  const selectedIndex = Number.parseInt(sunset.classification.sectorId.slice(1), 10) - 1;
  const markerX = x + (selectedIndex + 0.5) * bandWidth;
  pdf.setLineWidth(0.8);
  pdf.line(markerX, y - 2, markerX, y + height + 2);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(sunset.classification.sectorId, markerX, y + height + 6, { align: "center" });
}

export function solarTiming(sunset: AnalysedSunset): string | null {
  const minutes = sunset.minutesFromSunset;
  return minutes === undefined ? null : `${minutes >= 0 ? "+" : "-"}${Math.abs(minutes)} min ${minutes >= 0 ? "after" : "before"} sunset`;
}

export function densityLines(context: PdfTemplateContext): string[] {
  return [...selectExportContent({ ...context, surface: "poster" }).metrics];
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

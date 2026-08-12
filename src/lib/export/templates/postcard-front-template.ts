import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import { drawFooter, drawFoundation, drawIdentity, INK } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

function rgb(hex: string): readonly [number, number, number] {
  const value = hex.replace("#", "");
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
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

function drawPostcardInstrument(context: PdfTemplateContext, x: number, y: number, width: number, height: number) {
  const { pdf, imageData } = context;
  const centreX = x + width / 2;
  const centreY = y + height / 2;
  const apertureRadius = Math.min(width, height) * 0.23;

  SUNSET_COLOUR_TAXONOMY.forEach((sector, index) => {
    const start = perimeterPoint(x, y, width, height, index / SUNSET_COLOUR_TAXONOMY.length);
    const end = perimeterPoint(x, y, width, height, (index + 1) / SUNSET_COLOUR_TAXONOMY.length);
    pdf.setFillColor(...rgb(sector.representativeHex));
    pdf.triangle(centreX, centreY, start.x, start.y, end.x, end.y, "F");
    pdf.setDrawColor(255, 250, 240);
    pdf.setLineWidth(0.12);
    pdf.line(centreX, centreY, start.x, start.y);
  });

  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.35);
  pdf.rect(x, y, width, height, "S");
  pdf.saveGraphicsState();
  pdf.circle(centreX, centreY, apertureRadius, null);
  pdf.clip();
  const imageWidth = apertureRadius * 3.2;
  const imageHeight = apertureRadius * 2;
  pdf.addImage(imageData, "JPEG", centreX - imageWidth / 2, centreY - imageHeight / 2, imageWidth, imageHeight);
  pdf.restoreGraphicsState();
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.7);
  pdf.circle(centreX, centreY, apertureRadius, "S");
}

export function drawPostcardFrontTemplate(context: PdfTemplateContext) {
  const { pdf, sunset } = context;
  const { width, height, margin } = drawFoundation(pdf, "POSTCARD / FRONT");
  const landscape = width > height;
  const fieldHeight = height * (landscape ? 0.68 : 0.58);
  drawPostcardInstrument(context, margin, 22, width - margin * 2, fieldHeight);
  drawIdentity(context, margin, 22 + fieldHeight + 18, width - margin * 2, true);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`${sunset.classification.sectorId} - ${sunset.classification.sectorName}`, margin, 22 + fieldHeight + 31);
  drawFooter(pdf, sunset);
}

import { drawCircularScale, drawFooter, drawFoundation, drawPrintAtlasInstrument, INK } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

function drawCompactCaption(
  context: PdfTemplateContext,
  x: number,
  y: number,
  maxWidth: number,
  align: "left" | "center",
) {
  const { pdf, sunset } = context;
  pdf.setTextColor(...INK);
  pdf.setFont("times", "normal");
  pdf.setFontSize(20);
  pdf.text(sunset.displayName, x, y, { align, maxWidth });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(`${sunset.date}  /  ${sunset.location}`, x, y + 10, { align, maxWidth });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(`${sunset.classification.sectorId}  —  ${sunset.classification.sectorName}`, x, y + 19, {
    align,
    maxWidth,
  });
}

export function drawPostcardFrontTemplate(context: PdfTemplateContext) {
  const { pdf, sunset, options } = context;
  const { width, height, margin } = drawFoundation(pdf, "POSTCARD / FRONT");
  const landscape = width > height;

  if (landscape) {
    const instrumentX = width * 0.29;
    const instrumentY = 23;
    const instrumentHeight = height - 61;
    if (options.layout === "atlas") {
      drawPrintAtlasInstrument(
        context,
        instrumentX,
        instrumentY,
        width - instrumentX - margin,
        instrumentHeight,
      );
    } else {
      const radius = Math.min(height * 0.33, width * 0.24);
      drawCircularScale(context, width * 0.62, height * 0.47, radius);
    }
    drawCompactCaption(context, margin, height * 0.4, instrumentX - margin * 1.7, "left");
  } else if (options.layout === "atlas") {
    const fieldY = 22;
    const fieldHeight = height * 0.65;
    drawPrintAtlasInstrument(context, margin, fieldY, width - margin * 2, fieldHeight);
    drawCompactCaption(context, width / 2, fieldY + fieldHeight + 18, width - margin * 2, "center");
  } else {
    const radius = Math.min(width * 0.39, height * 0.27);
    const centreY = 23 + radius;
    drawCircularScale(context, width / 2, centreY, radius);
    drawCompactCaption(context, width / 2, centreY + radius + 18, width - margin * 2, "center");
  }
  drawFooter(pdf, sunset);
}

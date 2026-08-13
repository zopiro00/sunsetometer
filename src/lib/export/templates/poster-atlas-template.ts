import { densityLines, drawFooter, drawFoundation, drawIdentity, drawPrintAtlasInstrument, INK, posterInterpretation } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

export function drawAtlasPosterTemplate(context: PdfTemplateContext) {
  const { pdf, sunset, options } = context;
  const { width, height, margin } = drawFoundation(pdf, "ATLAS POSTER");
  const landscape = width > height;
  if (landscape) {
    const fieldX = width * 0.29;
    const fieldY = 24;
    const fieldHeight = height - 62;
    drawPrintAtlasInstrument(context, fieldX, fieldY, width - fieldX - margin, fieldHeight);
    drawIdentity(context, margin, height * 0.39, fieldX - margin * 1.7, true);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...INK);
    pdf.text(`${sunset.classification.sectorId} — ${sunset.classification.sectorName}`, margin, height * 0.52);
    if (options.density !== "minimal") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(densityLines(context), margin, height * 0.59, {
        lineHeightFactor: 1.5,
        maxWidth: fieldX - margin * 1.7,
      });
    }
    const interpretation = posterInterpretation(context);
    if (interpretation) {
      pdf.setFont("times", "italic");
      pdf.setFontSize(7);
      pdf.text(interpretation, margin, height * 0.78, { maxWidth: fieldX - margin * 1.7, lineHeightFactor: 1.35 });
    }
  } else {
    const fieldY = 24;
    const fieldHeight = height * 0.62;
    drawPrintAtlasInstrument(context, margin, fieldY, width - margin * 2, fieldHeight);
    const identityY = fieldY + fieldHeight + 22;
    drawIdentity(context, margin, identityY, width * 0.52, true);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...INK);
    pdf.text(`${sunset.classification.sectorId} — ${sunset.classification.sectorName}`, margin, identityY + 23);
    if (options.density !== "minimal") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(densityLines(context), width * 0.62, identityY, {
        lineHeightFactor: 1.5,
        maxWidth: width - margin - width * 0.62,
      });
    }
    const interpretation = posterInterpretation(context);
    if (interpretation) {
      pdf.setFont("times", "italic");
      pdf.setFontSize(7);
      pdf.text(interpretation, margin, identityY + 39, { maxWidth: width - margin * 2, lineHeightFactor: 1.35 });
    }
  }
  drawFooter(pdf, sunset);
}

import { densityLines, drawCircularScale, drawFooter, drawFoundation, drawIdentity } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

export function drawCircularPosterTemplate(context: PdfTemplateContext) {
  const { pdf, sunset, imageData, options } = context;
  const { width, height, margin } = drawFoundation(pdf, "CIRCULAR POSTER");
  const landscape = width > height;
  if (landscape) {
    const imageWidth = width * 0.55;
    pdf.addImage(imageData, "JPEG", margin, 23, imageWidth, height - 60);
    const centreX = margin + imageWidth + (width - margin * 2 - imageWidth) / 2;
    drawCircularScale(pdf, centreX, height * 0.35, Math.min(42, height * 0.18), sunset);
    drawIdentity(context, margin + imageWidth + 12, height * 0.61, width - margin * 2 - imageWidth - 12);
    if (options.density !== "minimal") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(densityLines(context), margin + imageWidth + 12, height * 0.73, { lineHeightFactor: 1.55 });
    }
  } else {
    const imageHeight = height * 0.42;
    pdf.addImage(imageData, "JPEG", margin, 23, width - margin * 2, imageHeight);
    drawCircularScale(pdf, width - margin - 29, 23 + imageHeight + 35, 25, sunset);
    drawIdentity(context, margin, 23 + imageHeight + 27, width - margin * 2 - 62);
    if (options.density !== "minimal") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(densityLines(context), margin, 23 + imageHeight + 55, { lineHeightFactor: 1.55 });
    }
  }
  drawFooter(pdf, sunset);
}

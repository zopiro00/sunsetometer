import { densityLines, drawAtlasScale, drawFooter, drawFoundation, drawIdentity } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

export function drawAtlasPosterTemplate(context: PdfTemplateContext) {
  const { pdf, sunset, imageData, options } = context;
  const { width, height, margin } = drawFoundation(pdf, "ATLAS POSTER");
  const landscape = width > height;
  const imageHeight = height * (landscape ? 0.48 : 0.39);
  pdf.addImage(imageData, "JPEG", margin, 23, width - margin * 2, imageHeight);
  const scaleY = 23 + imageHeight + 12;
  drawAtlasScale(pdf, margin, scaleY, width - margin * 2, landscape ? 18 : 22, sunset);
  drawIdentity(context, margin, scaleY + (landscape ? 38 : 43), width * 0.56);
  if (options.density !== "minimal") {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(densityLines(context), width * 0.63, scaleY + (landscape ? 34 : 42), { lineHeightFactor: 1.55, maxWidth: width - margin - width * 0.63 });
  }
  drawFooter(pdf, sunset);
}

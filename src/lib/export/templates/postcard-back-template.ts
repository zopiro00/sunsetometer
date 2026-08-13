import { selectExportContent } from "@/lib/export/export-content-rules";
import { drawFooter, drawFoundation, INK, solarTiming } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

export function drawPostcardBackTemplate(context: PdfTemplateContext, label = "POSTCARD / BACK") {
  const { pdf, sunset } = context;
  const isPosterReverse = label === "POSTER / REVERSE";
  const content = selectExportContent({ ...context, surface: "postcard-back" });
  const { width, height, margin } = drawFoundation(pdf, label, 7);
  const dividerX = width * 0.57;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(90, 77, 69);
  pdf.text(
    isPosterReverse ? "ARCHIVE VERSO · STRUCTURED EVIDENCE" : "CORRESPONDENCE SIDE · STRUCTURED EVIDENCE",
    margin,
    26,
  );
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.25);
  pdf.line(dividerX, 30, dividerX, height - 38);

  pdf.setFont("times", "normal");
  pdf.setFontSize(24);
  pdf.text(sunset.displayName, margin, 43, { maxWidth: dividerX - margin * 2 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`${sunset.classification.sectorId} - ${sunset.classification.sectorName}`, margin, 57);
  pdf.text([...content.metrics], margin, 70, { lineHeightFactor: 1.65, maxWidth: dividerX - margin * 2 });
  if (content.interpretation) {
    pdf.setFont("times", "italic");
    pdf.setFontSize(10);
    pdf.text(content.interpretation, margin, 116, { maxWidth: dividerX - margin * 2, lineHeightFactor: 1.4 });
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("POSTAGE", width - margin - 27, 39, { align: "center" });
  pdf.rect(width - margin - 40, 29, 26, 20, "S");
  for (let y = 76; y < Math.min(height - 48, 155); y += 14) pdf.line(dividerX + 12, y, width - margin, y);
  pdf.setFontSize(8);
  pdf.text(`${sunset.date} / ${sunset.location}`, margin, height - 42, { maxWidth: dividerX - margin * 2 });
  const timing = solarTiming(sunset);
  if (timing) pdf.text(timing, margin, height - 34);
  drawFooter(pdf, sunset);
}

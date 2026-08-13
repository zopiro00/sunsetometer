import { densityLines, drawCircularScale, drawFooter, drawFoundation, INK, posterInterpretation } from "@/lib/export/templates/shared";
import type { PdfTemplateContext } from "@/lib/export/templates/types";

function supportingLines(context: PdfTemplateContext): string[] {
  const { sunset, options } = context;
  const limit = options.density === "minimal" ? 2 : options.density === "standard" ? 4 : 7;
  return densityLines(context)
    .filter((line) => !line.startsWith(`${sunset.classification.sectorId} -`))
    .slice(0, limit);
}

function drawPortraitCaption(context: PdfTemplateContext, y: number, margin: number, width: number) {
  const { pdf, sunset } = context;
  const lines = supportingLines(context);
  const interpretation = posterInterpretation(context);
  pdf.setTextColor(...INK);
  pdf.setFont("times", "normal");
  pdf.setFontSize(25);
  pdf.text(sunset.displayName, width / 2, y, { align: "center", maxWidth: width - margin * 2 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`${sunset.date}  /  ${sunset.location}`, width / 2, y + 10, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `${sunset.classification.sectorId}  —  ${sunset.classification.sectorName}`,
    width / 2,
    y + 19,
    { align: "center" },
  );
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  if (lines.length <= 3) {
    pdf.text(lines.join("   ·   "), width / 2, y + 27, {
      align: "center",
      maxWidth: width - margin * 2,
    });
    return;
  }
  const split = Math.ceil(lines.length / 2);
  pdf.text(lines.slice(0, split), width * 0.28, y + 27, { align: "center", lineHeightFactor: 1.45 });
  pdf.text(lines.slice(split), width * 0.72, y + 27, { align: "center", lineHeightFactor: 1.45 });
  if (interpretation) {
    pdf.setFont("times", "italic");
    pdf.text(interpretation, width / 2, y + 48, { align: "center", maxWidth: width - margin * 3 });
  }
}

function drawLandscapeCaption(context: PdfTemplateContext, x: number, centreY: number, width: number) {
  const { pdf, sunset } = context;
  const lines = supportingLines(context);
  const interpretation = posterInterpretation(context);
  pdf.setTextColor(...INK);
  pdf.setFont("times", "normal");
  pdf.setFontSize(25);
  pdf.text(sunset.displayName, x, centreY - 28, { maxWidth: width });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`${sunset.date}\n${sunset.location}`, x, centreY - 14, {
    lineHeightFactor: 1.45,
    maxWidth: width,
  });
  pdf.setFont("helvetica", "bold");
  pdf.text(`${sunset.classification.sectorId}  —  ${sunset.classification.sectorName}`, x, centreY + 5, {
    maxWidth: width,
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(lines, x, centreY + 17, { lineHeightFactor: 1.55, maxWidth: width });
  if (interpretation) {
    pdf.setFont("times", "italic");
    pdf.text(interpretation, x, centreY + 56, { lineHeightFactor: 1.35, maxWidth: width });
  }
}

export function drawCircularPosterTemplate(context: PdfTemplateContext) {
  const { pdf, sunset } = context;
  const { width, height, margin } = drawFoundation(pdf, "CIRCULAR POSTER");
  const landscape = width > height;
  const instrumentRadius = landscape
    ? Math.min(height * 0.335, width * 0.285)
    : Math.min(width * 0.4, height * 0.285);
  const centreX = landscape ? width * 0.62 : width * 0.5;
  const centreY = landscape ? height * 0.47 : 24 + instrumentRadius;
  drawCircularScale(context, centreX, centreY, instrumentRadius);

  if (landscape) {
    drawLandscapeCaption(context, margin, centreY, width * 0.245);
  } else {
    drawPortraitCaption(context, centreY + instrumentRadius + 18, margin, width);
  }
  drawFooter(pdf, sunset);
}

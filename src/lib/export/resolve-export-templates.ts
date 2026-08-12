import type { SunsetExportOptions } from "@/lib/export/sunset-poster";

export type SunsetExportTemplateId =
  | "poster-circular"
  | "poster-atlas"
  | "postcard-front"
  | "postcard-back";

export function resolveSunsetExportTemplates(
  options: SunsetExportOptions,
): readonly SunsetExportTemplateId[] {
  const front: SunsetExportTemplateId = options.format === "postcard"
    ? "postcard-front"
    : options.layout === "atlas"
      ? "poster-atlas"
      : "poster-circular";
  return options.sides === "front-back" ? [front, "postcard-back"] : [front];
}

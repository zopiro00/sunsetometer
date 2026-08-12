import { describe, expect, it } from "vitest";

import {
  buildSunsetExportFilename,
  DEFAULT_SUNSET_EXPORT_OPTIONS,
} from "@/lib/export/sunset-poster";
import { resolveSunsetExportTemplates } from "@/lib/export/resolve-export-templates";

describe("resolveSunsetExportTemplates", () => {
  it("selects the circular poster template", () => {
    expect(resolveSunsetExportTemplates(DEFAULT_SUNSET_EXPORT_OPTIONS)).toEqual(["poster-circular"]);
  });

  it("selects the Atlas poster template", () => {
    expect(resolveSunsetExportTemplates({ ...DEFAULT_SUNSET_EXPORT_OPTIONS, layout: "atlas" })).toEqual(["poster-atlas"]);
  });

  it("uses the postcard front and back templates for a two-sided postcard", () => {
    expect(resolveSunsetExportTemplates({
      ...DEFAULT_SUNSET_EXPORT_OPTIONS,
      format: "postcard",
      sides: "front-back",
    })).toEqual(["postcard-front", "postcard-back"]);
  });
});

describe("buildSunsetExportFilename", () => {
  it("uses the display name and selected export configuration", () => {
    expect(buildSunsetExportFilename("Amber Descent", {
      ...DEFAULT_SUNSET_EXPORT_OPTIONS,
      layout: "atlas",
      format: "postcard",
      sides: "front-back",
      paperSize: "a3",
    })).toBe("amber-descent-atlas-postcard-front-back.pdf");
  });

  it("never falls back to an uploaded image filename", () => {
    expect(buildSunsetExportFilename("Distant Ember", DEFAULT_SUNSET_EXPORT_OPTIONS))
      .toBe("distant-ember-circular-poster.pdf");
  });

  it("produces valid distinct names across every export axis", () => {
    const names = new Set<string>();
    for (const layout of ["circular", "atlas"] as const) {
      for (const format of ["poster", "postcard"] as const) {
        for (const sides of ["front", "front-back"] as const) {
          for (const orientation of ["portrait", "landscape"] as const) {
            const filename = buildSunsetExportFilename("Distant Ember", {
              ...DEFAULT_SUNSET_EXPORT_OPTIONS,
              layout,
              format,
              sides,
              orientation,
            });
            expect(filename).toMatch(/^distant-ember-(circular|atlas)-(poster|postcard)(-front-back)?\.pdf$/);
            names.add(`${orientation}:${filename}`);
          }
        }
      }
    }
    expect(names).toHaveLength(16);
  });
});

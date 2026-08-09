# Radial Sunsetometer classification instrument

## Status and scope

This is an implementation plan only. No interface code is changed by this
document.

The referenced visual was not available as a file in the repository or current
attachment cache during inspection. The geometry below is therefore based on
the written reference: a large circular opening, narrow radial colour sectors,
fine subdivisions, numbered perimeter, overlaid observation points, and the
character of a physical measuring instrument. The reference should be reviewed
visually before geometry and typography are finalized.

## Existing implementation

The current application is still a project shell:

- `src/app/page.tsx` provides the server-rendered page structure.
- `src/components/sunset-orbit/sunset-orbit.tsx` displays eight static test
  photographs around a decorative orbit. It has no measured chromatic mapping
  or selection state.
- `src/domain/provenance.ts` provides the six evidence/provenance labels and can
  be reused by the selected-record panel.
- `src/lib/colour-analysis/index.ts`, `src/lib/image-metadata/index.ts`,
  `src/lib/solar/index.ts`, and `src/services/weather/index.ts` are placeholders.
- `public/test-sunsets/` contains eight representative test assets.
- The metadata, weather, solar, colour-analysis, and deterministic
  classification workflows described in the roadmap have not been implemented.

There is therefore no existing colour-analysis data model to connect to yet and
no working metadata, weather, or analysis functionality to remove or rewrite.
The new visualization must depend on a small domain contract rather than encode
mock values inside its rendering component.

## Proposed analyzed-sunset contract

```ts
type AnalyzedSunset = {
  id: string;
  image: {
    src: string;
    alt: string;
  };
  chromatic: {
    dominantHueDegrees: number;      // measured, normalized to [0, 360)
    averageSaturation: number;       // measured, normalized to [0, 1]
    averageLuminance: number;        // measured, normalized to [0, 1]
    representativeColours: readonly string[];
    analysisVersion: string;
    region: "whole-image" | "selected-sky";
  } | null;
  metadata: {
    capturedAtLabel?: string;
    approximatePlaceLabel?: string;
  };
  classification?: {
    primaryColourFamily: string;
    gradientType?: string;
    saturationCategory?: string;
    afterglowCategory?: string;
  };
};
```

The visualization should accept `readonly AnalyzedSunset[]` and a selected ID.
It should not know about EXIF parsers, weather providers, canvas pixels, exact
coordinates, or provider payloads.

Until real analysis exists, test records must be labeled as demonstration data.
Their dots must not be described as measured unless a local analysis function
has actually produced the values.

## Chromatic mapping

Use a documented polar mapping:

- **Angle:** dominant hue in degrees.
- **Radius:** average saturation, mapped from the inner edge of the coloured
  annulus to its outer edge.
- **Dot fill:** the measured representative or dominant colour.
- **Luminance:** expressed through a small secondary tick, halo, or documented
  dot treatment rather than silently changing the dot’s position.
- **Unavailable analysis:** keep the record out of the measured field and place
  it in an adjacent “unpositioned” list; do not invent a location.

The current implementation uses **OKLCH chroma** for radial distance because it
is more perceptually meaningful than HSL saturation. Chroma 0 maps to the inner
boundary and chroma 0.25 or above maps to the outer boundary. Both the chroma
range and radial metric are configuration values; the same pure mapping
function can switch to normalized HSL saturation without changing SVG rendering.

### Marker collision display

The calculated classification coordinate remains the source of truth. A
separate deterministic display layer detects markers closer than the configured
SVG-space collision threshold and distributes them in small ordered rings around
their shared coordinate. Thin leader lines point back to the true location.
Every offset marker remains an individual keyboard-operable control; no
force-directed movement or animation is used.

This gives every spatial dimension a stable scientific meaning. If later
testing shows that perceptual chroma is more useful than HSL saturation, change
the mapping only through a versioned analysis/mapping contract.

The radial field should use many narrow SVG sectors generated from a perceptual
colour scale. Major perimeter marks can label hue families or degrees; minor
ticks provide the fine measuring-instrument subdivisions. Labels must not imply
measurement accuracy beyond the underlying image analysis.

## Reusable and replaceable pieces

Reuse:

- the page, layout, and existing editorial/scientific visual tokens;
- `next/image` for the selected photograph;
- the test assets as clearly labeled visual fixtures;
- provenance labels for measured, metadata, retrieved, calculated,
  interpretative, and poetic values;
- the existing responsive and reduced-motion baseline.

Replace rather than extend:

- the decorative `SunsetOrbit` geometry and its hard-coded positions;
- numbered photograph thumbnails around the orbit;
- the non-interactive centre label.

Keep the old component until the new instrument passes visual, interaction, and
accessibility checks, then remove only its now-unused markup and styles.

## Proposed component hierarchy

```text
HomePage                                  Server Component
  ClassificationSection                  Server Component
    SunsetInstrument                     Client Component boundary
      InstrumentHeader                   static copy and legend
      RadialField
        ColourSectors                    SVG, decorative
        PerimeterScale                   SVG marks and labels
        SunsetMarkers                    keyboard-operable controls
      CentralViewingWindow
        SelectedSunsetImage
        EmptySelectionState
      InstrumentLegend                   explains angle/radius/dot encoding
      SunsetRecordList                   accessible non-spatial alternative
      SelectedSunsetDetails
        ChromaticSummary
        MetadataSummary
        ClassificationSummary
        ProvenanceLabels
```

Only `SunsetInstrument` and descendants that handle selection should enter the
client bundle. The page and surrounding editorial content should remain Server
Components. Props crossing that boundary must remain serializable.

## Interaction and accessibility

- Render each sunset dot as a real button with its photograph name/date as the
  accessible name.
- Selecting a dot updates the central image and details without moving focus.
- Support pointer selection, Tab navigation, Enter/Space activation, and
  optional arrow-key movement between nearby points.
- Expose selection through `aria-pressed` or an equivalent single-selection
  pattern and announce the updated record in a restrained live region.
- Provide a textual record list that offers the same selection and information;
  the graphic cannot be the only route to a sunset.
- Use outlines, shapes, and labels so selected/unselected state does not depend
  on colour alone.
- Maintain useful image alternative text and do not describe automatically
  inferred atmospheric causes as facts.
- Avoid animated rotation; use minimal transitions and honor reduced motion.

## Implementation sequence

1. Review the supplied reference image and approve the visual geometry.
2. Add and test the `AnalyzedSunset` contract plus polar-coordinate mapper.
3. Create labeled fixture records; use measured values only if local analysis
   has genuinely run.
4. Build a static SVG radial field, subdivisions, and perimeter scale.
5. Add the small interactive client boundary for marker selection.
6. Add the central viewing window and accessible record-list equivalent.
7. Connect the selected record to chromatic, metadata, and classification
   panels through the domain contract.
8. Replace `SunsetOrbit` on the page only after desktop, mobile, keyboard,
   screen-reader, and reduced-motion verification.
9. Run lint, type checking, unit tests, production build, and browser visual
   checks with no console errors or horizontal overflow.

## Tests

- hue normalization and polar coordinate mapping;
- radius clamping for saturation boundaries;
- stable handling of missing chromatic analysis;
- selected-record fallback when an ID disappears;
- keyboard selection behavior;
- semantic/accessibility checks for marker controls and the equivalent list;
- responsive visual checks for overlap, central crop, perimeter labels, and
  minimum target size.

## Decisions required before implementation

- Obtain the actual reference image for direct visual inspection.
- Confirm whether hue angle and saturation radius match the intended scientific
  reading.
- Decide whether the first prototype may calculate real fixture values locally
  or must use clearly labeled demonstration values.
- Choose the perimeter notation: degrees, numbered sectors, colour-family names,
  or a combination.
- Decide which selected-record fields appear beside the instrument on wide
  screens and below it on narrow screens.

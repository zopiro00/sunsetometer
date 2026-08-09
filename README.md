# Sunsetometer

Sunsetometer is a poetic but scientifically grounded instrument for analysing
and classifying sunset photographs. It measures the selected sky region,
places the observation within a dedicated sunset colour taxonomy, and keeps
measured evidence separate from metadata, calculated context, interpretation,
and poetic naming.

The current repository contains a device-library prototype. Analysis happens
locally in the browser: photographs are not permanently uploaded, and the user
must define the sky region before colour analysis begins.

## Current prototype

- device photograph selection and local preview;
- mandatory manual sky-region selection;
- perceptual sky-colour analysis using OKLab/OKLCH;
- exclusion of very dark pixels and likely silhouette contamination;
- primary, secondary, average, horizon, and upper-sky colour measurements;
- a stable 60-sector Sunsetometer colour taxonomy (`S01`–`S60`);
- chromatic placement using hue for angle and chroma for radial distance;
- Circular View with a central specimen viewer;
- Atlas View using the same taxonomy, observations, and selected sunset state;
- deterministic marker collision handling;
- keyboard-accessible markers, sectors, and view controls;
- a structured selected-sunset information panel;
- deterministic provisional poetic names that users can edit;
- development diagnostics and a demo dataset;
- tests for the important pure colour, geometry, naming, and placement logic.

Atmospheric explanations use cautious language such as “may have contributed
to.” Poetic classification remains visibly distinct from scientific evidence.

## Project structure

```text
src/
  app/                         App Router pages, layout, and styling
  components/                  instrument and analysis interface components
  data/                        development/demo observations
  domain/                      shared domain models and colour taxonomy
  lib/
    colour-analysis/           colour measurement and classification logic
    image-metadata/            local metadata boundary
    solar/                     solar-context boundary
  services/
    weather/                   provider-neutral weather boundary
tests/                         pure-function tests
public/test-sunsets/           development/demo photographs
```

## Local development

Node.js 20.9 or newer is required.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment variables

No environment variables are required for the current prototype. Future
server-only provider configuration will be documented in `.env.example`.

Secrets belong in `.env.local`, which is excluded from version control. Do not
use the `NEXT_PUBLIC_` prefix for secrets because those values are exposed to
browser code.

## Privacy model

- Selected photographs remain in the browser during the current prototype.
- No user accounts, database, permanent image uploads, or Google Photos access
  are implemented.
- The user selects the authoritative sky crop; the full photograph is not
  silently treated as sky.
- Exact coordinates should remain transient and must not be displayed or
  transmitted unnecessarily.
- Original filenames are retained only for technical purposes and are not used
  as user-facing sunset names.
- Local object URLs are revoked when photographs are removed or replaced.
- External API calls must use server routes and minimized inputs when those
  integrations are introduced.

The photographs in `public/test-sunsets/` are development fixtures. The larger
source-photo collection is intentionally kept outside this repository.

## Evidence model

The interface distinguishes:

1. measurements made directly from the selected sky region;
2. information read from photograph metadata;
3. historical weather or atmospheric data from external providers;
4. calculated solar information;
5. cautious interpretative hypotheses;
6. poetic or subjective classification.

The image measurement pipeline and rule-based interpretation remain the factual
foundation. Future generated narration must use structured evidence, preserve
uncertainty, and never invent unavailable atmospheric conditions.

## Current limitations

- Historical weather and atmospheric providers are not yet connected.
- Solar calculations and metadata extraction remain partial integration
  boundaries.
- Analysed observations persist only for the current browser session.
- Demo photographs are repository fixtures rather than a private archive.
- Browser and camera colour-management differences can affect measurements.
- The manual sky crop can still include clouds or foreground contamination.

## Planning documents

- [Implementation plan](./IMPLEMENTATION_PLAN.md)
- [Radial instrument plan](./RADIAL_INSTRUMENT_PLAN.md)
- [Sky colour analysis](./SKY_COLOUR_ANALYSIS.md)
- [Phase 2 plan](./PHASE_2_PLAN.md)

Phase 2—including Google Photos, accounts, archives, public sharing, deeper
atmospheric data, similarity browsing, and optional generative narration—must
not begin until the device-library MVP has been reviewed and approved.

# Sunsetometer implementation plan

## Scope of this task

Only the project foundation is implemented: framework configuration, quality tools, a non-functional page shell, modular directories, documentation, provenance types, and one basic pure-function test.

## Architectural rules

- Keep image bytes, previews, EXIF parsing, and colour measurement in the browser.
- Never send the photograph to an external service unless a future requirement explicitly needs it and the interface explains this before consent.
- Send only minimized, validated time and location data to same-origin server routes.
- Keep external providers behind adapters and normalize their responses into domain types.
- Preserve partial results when metadata, weather, or another source is unavailable.
- Attach one provenance category to every displayed fact or statement.
- Keep interpretation separate from acquisition and calculation.
- Use cautious scientific language: conditions “may have contributed to” an effect, never definitive causal claims.
- Do not expose precise coordinates in the interface, URLs, logs, analytics, or error messages.

## Delivery sequence

### 1. Foundation — complete

- Scaffold Next.js, TypeScript, ESLint, and Vitest.
- Establish the App Router shell and temporary visual direction.
- Create modular directories and initial provenance contracts.
- Document architecture, privacy assumptions, commands, and milestones.

### 2. Device photo picker

- Implement an accessible single-file picker and local preview.
- Validate browser-supported photographic formats and file limits.
- Display filename, MIME type, and human-readable size.
- Support removal/replacement and revoke every object URL.
- Add pure validation tests and empty/error states.

### 3. Metadata review

- Select an EXIF parser after testing JPEG and HEIC behavior on iOS Safari.
- Parse only an allowlist of required fields in the client.
- Normalize detected, user-entered, inferred, and unavailable values.
- Add accessible correction controls without assuming current location.

### 4. Location confirmation

- Add a replaceable geocoding adapter.
- Keep exact retrieval coordinates private while showing an approximate label.
- Let users change or remove the public/archive location.
- Define coordinate minimization and provider retention requirements before live calls.

### 5. Solar context

- Adopt a maintained astronomy library and document its assumptions.
- Calculate sunset, elevation, azimuth, relative minutes, and twilight phase.
- Test known locations/dates, timezone boundaries, and polar edge cases.

### 6. Historical atmosphere

- Evaluate providers for historical depth, resolution, attribution, retention, and data provenance.
- Add typed server-only environment validation and a provider-neutral route.
- Preserve record timestamp, time difference, provider, and observation/model status.
- Add mocked tests, timeouts, retry guidance, and non-blocking failure states.

### 7. Local colour analysis

- Normalize orientation and document colour-management limitations.
- Add whole-image and selected-sky-region modes.
- Keep pixel calculations pure and independently tested with generated data.
- Measure palette, hue, saturation, luminance, temperature ratio, diversity, contrast, gradient, and horizontal-band fingerprint.

### 8. Deterministic classification

- Compose image, metadata, solar, atmospheric, and chromatic results.
- Keep provenance visible and poetic language visibly subjective.
- Generate only rules-based classifications supported by available inputs.
- Audit all copy for causal overstatement and unsupported precision.

### 9. Hardening

- Test narrow screens, keyboard use, screen readers, contrast, and reduced motion.
- Test representative iPhone/browser/file-format combinations.
- Verify that no image bytes, raw EXIF, secrets, or unnecessary coordinates cross the network or enter persistent storage.
- Run lint, type checking, unit/integration tests, and production build.

## Acceptance criteria for future milestones

- Users understand what remains local and what may be transmitted before transmission.
- Every fact and interpretation has visible provenance.
- Missing or ambiguous data is disclosed, not guessed.
- Loading, empty, partial, error, and recovery states are accessible.
- Visual classifications have equivalent text and do not rely on colour alone.
- Important pure transformations have focused tests.

## Phase boundary

Completion of these milestones does not authorize Phase 2. The device-library
MVP must first be reviewed and explicitly approved. Google Photos integration,
OAuth, accounts, persistent archives, public sharing, deeper atmospheric data,
similarity and comparison features, memory fields, and generative AI remain
blocked behind that approval and the readiness gates in
[PHASE_2_PLAN.md](./PHASE_2_PLAN.md).

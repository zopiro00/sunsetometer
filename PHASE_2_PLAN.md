# Sunsetometer Phase 2 — gated roadmap

## Status

**Not approved for implementation.**

Phase 2 must not begin until the device-library MVP has been reviewed and
explicitly approved. This document records future milestones and decision gates;
it does not authorize or implement Google Photos, OAuth, accounts, storage,
sharing, additional providers, similarity features, or generative AI.

## Proposed sequence

1. Google Photos Picker integration and secure OAuth configuration.
2. Explicit handling of missing, stripped, or removed GPS metadata.
3. Optional user accounts.
4. A private sunset archive with user-controlled retention and deletion.
5. Public sharing using approximate location labels only.
6. Air-quality and aerosol data through provider-neutral adapters.
7. A richer, sunset-specific colour taxonomy.
8. Similarity-based browsing between sunsets.
9. Seasonal and geographical comparison.
10. User-written perception and memory fields.
11. Optional AI-assisted poetic narration based only on structured evidence.

Dependencies matter: persistent archives require accounts and a completed data
model; public sharing requires archive privacy controls; similarity and
comparison require a stable fingerprint and taxonomy; AI narration requires the
rule-based interpretation layer and evidence contract.

## Google Photos readiness gate

Immediately before implementation, review the current official Google Photos
Picker API and OAuth documentation. Record the review date and authoritative
links. Do not rely on an earlier cached understanding because scopes, token
lifetimes, media URL lifetimes, metadata fields, and policy requirements may
change.

The review must establish:

- the official selection and consent journey;
- required OAuth scopes and the narrowest sufficient scope;
- access-token lifetime, refresh behavior, revocation, and storage rules;
- picker session and selected-media URL lifetimes;
- which metadata fields Google supplies and which may be missing or stripped,
  especially GPS, original capture time, timezone, filename, and camera data;
- current branding, verification, privacy-policy, and data-use requirements;
- error behavior for expired sessions, removed items, revoked consent, and
  inaccessible media.

### Consent flow principles

- Start Google’s official picker only after a user explicitly chooses Google
  Photos as the source.
- Explain what access is requested, what selected data will be processed, what
  may be stored, and how access can be revoked.
- Use Google’s official selection and consent mechanisms. Do not build an
  interface that imitates or browses the Google Photos library.
- Treat absent GPS or other metadata as unavailable. Never infer that the
  current device location is the capture location.
- Ask separately for archive storage; selecting a photograph is not consent to
  retain it.

### Proposed responsibility boundary

**Browser**

- Initiates the official user-controlled picker flow.
- Shows consent, selection state, metadata gaps, and recoverable errors.
- Sends only required short-lived authorization artifacts to same-origin server
  endpoints over HTTPS.
- Never contains an OAuth client secret or long-lived provider credential.

**Server**

- Holds client secrets and validates OAuth state, PKCE material where applicable,
  redirect targets, sessions, and provider responses.
- Exchanges and refreshes tokens only when the official flow requires it.
- Encrypts retained tokens, limits their lifetime and scope, and supports
  revocation and deletion.
- Fetches selected media or metadata only for the user-selected item and only
  for the disclosed purpose.
- Redacts tokens, media URLs, exact coordinates, and personal metadata from logs
  and error responses.

The precise split must be reconciled with the official API documentation during
the implementation review.

## Archive readiness gate

Before persistence is built, complete a privacy and threat-model review and
approve a data-retention policy.

### Preliminary data model

The model should keep visibility and retention explicit rather than relying on
implicit defaults:

```text
User
  id
  createdAt
  deletionRequestedAt?

SunsetEntry
  id
  ownerId
  capturedAt
  captureTimezone
  publicPlaceLabel?
  visibility              private | unlisted | public
  createdAt
  updatedAt
  deletedAt?

PrivateLocation
  sunsetEntryId
  encryptedLatitude
  encryptedLongitude
  source                  photo | user | inferred
  retrievalPrecision

ImageAsset
  id
  sunsetEntryId
  storageKey
  mimeType
  byteSize
  consentedAt
  retentionPolicy
  deletedAt?

AnalysisSnapshot
  id
  sunsetEntryId
  schemaVersion
  imageMeasurements
  normalizedMetadata
  solarContext
  atmosphericRecord
  activatedRules
  createdAt

UserReflection
  sunsetEntryId
  perception?
  memory?
  visibility              private | public
```

This is a proposal, not a final schema. Provider tokens and authentication
secrets must not be stored in sunset entries or analysis snapshots.

### Privacy classes

**Private by default**

- original image and derivatives;
- exact coordinates and retrieval precision;
- raw or identifying metadata;
- account identifiers and provider tokens;
- private archive entries;
- user reflections unless separately made public.

**Eligible for public sharing only by explicit choice**

- an approved image or privacy-safe derivative;
- approximate place label, never exact coordinates;
- selected date/time precision;
- chromatic fingerprint and deterministic classification;
- appropriately attributed atmospheric summary;
- user reflection explicitly marked public;
- poetic narration visibly labeled as such.

Public payloads must be constructed from an allowlist. They must not be a
serialization of the private record with selected fields hidden.

### Retention and deletion

- Obtain explicit, separate consent before storing an image.
- State what is stored, why, where, and for how long.
- Default new entries and images to private.
- Let users delete an entry and all associated originals, derivatives,
  reflections, analysis snapshots, indexes, and sharing links.
- Define bounded deletion for primary storage, caches, search/similarity indexes,
  and backups, and communicate any backup delay.
- Revoke public links promptly when an entry is made private or deleted.
- Remove orphaned uploads after failed or abandoned creation flows.
- Provide account deletion that covers entries, images, tokens, and derived
  indexes.

## Deeper atmospheric data

Air-quality and aerosol sources must use provider adapters and preserve:

- provider and dataset name;
- actual measurement/model timestamp and its difference from capture time;
- spatial resolution and distance from the confirmed location;
- whether each value is observed, reanalysis, forecast, or modeled;
- units, missing values, quality flags, and provider attribution;
- uncertainty and limitations relevant to sunset interpretation.

The rule-based interpretation layer must decide whether available evidence is
sufficient to activate a hypothesis. Missing aerosol data must never be
presented as clean air or as evidence that aerosols were absent.

## Taxonomy, similarity, and comparison

- Version the colour taxonomy and sunset-fingerprint algorithm.
- Base similarity on documented measurable features, with interpretable weights
  and tests, not on location, identity, or private reflections by default.
- Make camera processing, exposure, white balance, HDR, editing, crop, and sky
  selection visible limitations.
- Separate chromatic similarity from atmospheric, seasonal, and geographical
  similarity.
- Use normalized solar context, such as minutes from sunset and twilight phase,
  when comparing observations across dates and places.
- Aggregate or coarsen locations in public comparative views and apply minimum
  cohort thresholds where re-identification is plausible.

## User perception and memory

Perception and memory are first-person records, not scientific observations.
They should have their own provenance, visibility control, editing and deletion
behavior, and must not silently alter measured or retrieved facts.

## Generative AI readiness gate

AI-assisted poetic narration is optional and must be introduced only after the
deterministic atmospheric explanation is stable.

The model input must contain only:

- structured, provenance-labeled measurements and metadata approved for use;
- normalized solar and atmospheric data;
- activated deterministic rules;
- explicit confidence, missingness, and uncertainty fields;
- user-authored context only when the user chooses to include it.

The model must not receive unavailable conditions disguised as null-free prose
or be asked to infer missing atmospheric facts. Output validation must require:

- preservation of confidence and uncertainty;
- no invented weather, aerosols, metadata, causation, or precision;
- cautious phrases such as “may have contributed to” where mechanisms are
  discussed;
- a visible separation between scientific interpretation and poetic narration;
- a deterministic fallback when generation is unavailable or rejected.

Users must be told when structured data is sent to an AI service, which fields
are included, and whether the provider retains them. Image transmission requires
its own explicit justification and consent and is not implied by consent to
structured-data narration.

## Phase 2 approval checklist

- The device-library MVP has been reviewed and explicitly approved.
- Current official Google Photos and OAuth documentation has been reviewed and
  recorded.
- OAuth, token, URL-lifetime, consent, revocation, and metadata-gap behavior is
  documented.
- The archive schema, privacy classes, retention, deletion, export, and threat
  model are approved.
- Public payloads use an allowlist and contain no exact coordinates.
- Atmospheric adapters preserve origin, resolution, time difference, quality,
  and uncertainty.
- The taxonomy and similarity algorithms are versioned and testable.
- AI input/output contracts and scientific/poetic separation are approved.

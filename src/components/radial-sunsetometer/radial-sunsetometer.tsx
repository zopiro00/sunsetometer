"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { SelectedSunsetPanel } from "@/components/radial-sunsetometer/selected-sunset-panel";
import { SunsetAtlasView } from "@/components/radial-sunsetometer/sunset-atlas-view";
import type { AnalysedSunset } from "@/domain/analysed-sunset";
import {
  SUNSET_COLOUR_TAXONOMY,
  SUNSETOMETER_PERIMETER_LABELS,
} from "@/domain/sunset-colour-taxonomy";
import {
  DEFAULT_INSTRUMENT_POSITION_OPTIONS,
  sunsetToInstrumentPosition,
  SUNSETOMETER_VIEWBOX_SIZE,
} from "@/lib/colour-analysis";
import {
  createAnnularSectorPath,
  pointOnCircle,
  readableTangentialRotation,
} from "@/lib/radial-geometry";
import { resolveMarkerCollisions } from "@/lib/marker-collisions";

const VIEWBOX_SIZE = SUNSETOMETER_VIEWBOX_SIZE;
const CENTRE = VIEWBOX_SIZE / 2;
const BASE_INNER_RADIUS = DEFAULT_INSTRUMENT_POSITION_OPTIONS.innerRadius;
const OUTER_RADIUS = DEFAULT_INSTRUMENT_POSITION_OPTIONS.outerRadius;
const BASE_VIEWER_RADIUS = BASE_INNER_RADIUS - 5;
const LABEL_RADIUS = 438;
const FAMILY_LABEL_RADIUS = 472;
const SECTOR_ANGLE = 360 / SUNSET_COLOUR_TAXONOMY.length;
const ANGLE_OFFSET = DEFAULT_INSTRUMENT_POSITION_OPTIONS.angleOffset;
const MARKER_RADIUS = 6;
const SELECTED_MARKER_RADIUS = MARKER_RADIUS;
const MARKER_HIT_RADIUS = 8;
const VIEW_MODE_SESSION_KEY = "sunsetometer-instrument-view";
const PERIMETER_LABELS = new Map(
  SUNSETOMETER_PERIMETER_LABELS.map(({ sectorId, label }) => [sectorId, label]),
);

type RadialSunsetometerProps = {
  sunsets: readonly AnalysedSunset[];
  selectedSunsetId: string | null;
  onSelect: (sunsetId: string) => void;
  onRename: (sunsetId: string, displayName: string) => void;
};

type InstrumentViewMode = "circular" | "atlas";

export function RadialSunsetometer({
  sunsets,
  selectedSunsetId,
  onSelect,
  onRename,
}: RadialSunsetometerProps) {
  const [viewMode, setViewMode] = useState<InstrumentViewMode>("circular");
  const [apertureScale, setApertureScale] = useState(1);
  const [atlasPosition, setAtlasPosition] = useState(0.66);
  const [showObservationLine, setShowObservationLine] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [previewSectorId, setPreviewSectorId] = useState<string | null>(null);
  const [focusedSectorId, setFocusedSectorId] = useState(
    SUNSET_COLOUR_TAXONOMY[0]?.id ?? "",
  );
  const [focusedId, setFocusedId] = useState(
    sunsets[0]?.id ?? "",
  );
  const [viewerImageState, setViewerImageState] = useState<{
    id: string;
    status: "loaded" | "error";
  } | null>(null);
  const innerRadius = BASE_INNER_RADIUS * apertureScale;
  const viewerRadius = BASE_VIEWER_RADIUS * apertureScale;
  const positionedSunsets = useMemo(() => {
    const truePositions = sunsets.map((sunset) => ({
      sunset,
      position: sunsetToInstrumentPosition(sunset, { innerRadius }),
    }));
    const collisionPositions = new Map(
      resolveMarkerCollisions(
        truePositions.map(({ sunset, position }) => ({
          id: sunset.id,
          x: position.x,
          y: position.y,
        })),
      ).map((position) => [position.id, position]),
    );

    return truePositions.map((entry) => {
      const displayPosition = collisionPositions.get(entry.sunset.id);

      if (!displayPosition) {
        throw new Error(`Missing collision position for ${entry.sunset.id}`);
      }

      return { ...entry, displayPosition };
    });
  }, [innerRadius, sunsets]);
  const selected = positionedSunsets.find(
    ({ sunset }) => sunset.id === selectedSunsetId,
  );
  const preview = positionedSunsets.find(
    ({ sunset }) => sunset.id === previewId,
  );
  const displayed = preview ?? selected;
  const displayedImageStatus =
    displayed && viewerImageState?.id === displayed.sunset.id
      ? viewerImageState.status
      : "loading";
  const activeSectorId =
    previewSectorId ??
    preview?.position.sectorId ??
    selectedSectorId ??
    selected?.position.sectorId ??
    null;
  const activeSector = SUNSET_COLOUR_TAXONOMY.find(
    (sector) => sector.id === activeSectorId,
  );
  const activeMarker = preview ?? selected;
  const activeCollisionGroupId =
    activeMarker?.displayPosition.collisionGroupId;
  const activeCluster = activeCollisionGroupId
    ? positionedSunsets.filter(
        ({ displayPosition }) =>
          displayPosition.collisionGroupId === activeCollisionGroupId,
      )
    : [];

  useEffect(() => {
    const storedView = window.sessionStorage.getItem(VIEW_MODE_SESSION_KEY);

    if (storedView === "circular" || storedView === "atlas") {
      const restoreView = window.setTimeout(() => {
        setViewMode(storedView);
      }, 0);

      return () => window.clearTimeout(restoreView);
    }
  }, []);

  function selectView(nextView: InstrumentViewMode) {
    setViewMode(nextView);
    setPreviewId(null);
    setPreviewSectorId(null);
    window.sessionStorage.setItem(VIEW_MODE_SESSION_KEY, nextView);
  }

  function moveMarkerFocus(currentIndex: number, direction: number) {
    const nextIndex =
      (currentIndex + direction + positionedSunsets.length) %
      positionedSunsets.length;
    const nextId = positionedSunsets[nextIndex].sunset.id;

    setFocusedId(nextId);
    document.getElementById(`instrument-marker-${nextId}`)?.focus();
  }

  function moveSectorFocus(currentIndex: number, direction: number) {
    const nextIndex =
      (currentIndex + direction + SUNSET_COLOUR_TAXONOMY.length) %
      SUNSET_COLOUR_TAXONOMY.length;
    const nextId = SUNSET_COLOUR_TAXONOMY[nextIndex].id;

    setFocusedSectorId(nextId);
    document
      .getElementById(
        viewMode === "atlas"
          ? `instrument-sector-label-${nextId}`
          : `instrument-sector-${nextId}`,
      )
      ?.focus();
  }

  function handleMarkerKeyDown(
    event: KeyboardEvent<SVGGElement>,
    index: number,
    sunset: AnalysedSunset,
    sectorId: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(sunset.id);
      setSelectedSectorId(sectorId);
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveMarkerFocus(index, 1);
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveMarkerFocus(index, -1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveMarkerFocus(index, -index);
    }

    if (event.key === "End") {
      event.preventDefault();
      moveMarkerFocus(index, positionedSunsets.length - 1 - index);
    }
  }

  function handleSectorKeyDown(
    event: KeyboardEvent<SVGGElement>,
    sectorIndex: number,
    sectorId: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedSectorId(sectorId);
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSectorFocus(sectorIndex, 1);
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveSectorFocus(sectorIndex, -1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveSectorFocus(sectorIndex, -sectorIndex);
    }

    if (event.key === "End") {
      event.preventDefault();
      moveSectorFocus(
        sectorIndex,
        SUNSET_COLOUR_TAXONOMY.length - 1 - sectorIndex,
      );
    }
  }

  return (
    <section
      className={
        viewMode === "atlas"
          ? "instrumentSection instrumentSectionAtlas"
          : "instrumentSection instrumentSectionCircular"
      }
      aria-labelledby="instrument-title"
    >
      <div
        className={
          viewMode === "atlas"
            ? "instrumentHeading instrumentHeadingAtlas"
            : "instrumentHeading instrumentHeadingCircular"
        }
      >
        <div>
          <p className="sectionLabel">Chromatic classification instrument</p>
          <h2 id="instrument-title">
            {viewMode === "atlas"
              ? "Sunsetometer Atlas"
              : "Sunsetometer Circular"}
          </h2>
        </div>
        <div className="instrumentHeadingAside">
          <p className="instrumentIntroduction">
            The colour field is the measuring scale and the dots are sunset
            observations. Circular and Atlas views show the same classifications
            in two arrangements.
          </p>
          <div
            aria-label="Instrument view"
            className="instrumentViewSwitch"
            role="group"
          >
            <button
              aria-pressed={viewMode === "circular"}
              onClick={() => selectView("circular")}
              type="button"
            >
              Circular
            </button>
            <button
              aria-pressed={viewMode === "atlas"}
              onClick={() => selectView("atlas")}
              type="button"
            >
              Atlas
            </button>
          </div>
          <details className="instrumentSettings">
            <summary>Options</summary>
            <div>
              <label>
                <span className="instrumentSettingsLabel">
                  Circle size
                  <output>{Math.round(apertureScale * 100)}%</output>
                </span>
                <input
                  aria-label="Circle size"
                  max="1.2"
                  min="0.8"
                  onChange={(event) => setApertureScale(Number(event.target.value))}
                  step="0.01"
                  type="range"
                  value={apertureScale}
                />
              </label>
              {viewMode === "atlas" ? (
                <label>
                  <span className="instrumentSettingsLabel">
                    Circle position
                    <output>{Math.round(atlasPosition * 100)}%</output>
                  </span>
                  <input
                    aria-label="Circle position in Atlas"
                    max="0.78"
                    min="0.55"
                    onChange={(event) => setAtlasPosition(Number(event.target.value))}
                    step="0.01"
                    type="range"
                    value={atlasPosition}
                  />
                </label>
              ) : null}
              <label className="instrumentSettingsCheck">
                <input
                  checked={showObservationLine}
                  onChange={(event) => setShowObservationLine(event.target.checked)}
                  type="checkbox"
                />
                Connect dot to image
              </label>
            </div>
          </details>
        </div>
      </div>

      <div
        className={
          viewMode === "atlas"
            ? "instrumentWorkspace instrumentWorkspaceAtlas"
            : "instrumentWorkspace instrumentWorkspaceCircular"
        }
      >
        {viewMode === "circular" ? (
          <div className="instrumentFrame">
          <svg
          aria-labelledby="sunsetometer-svg-title sunsetometer-svg-description"
          className="instrumentSvg"
          role="img"
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <title id="sunsetometer-svg-title">
            Sunsetometer radial colour classification field
          </title>
          <desc id="sunsetometer-svg-description">
            An annular field of sixty sunset and twilight colour sectors,
            numbered S01 to S60, surrounding a circular photograph viewer.
          </desc>
          <defs>
            <clipPath id="sunsetometer-viewer-clip">
              <circle cx={CENTRE} cy={CENTRE} r={viewerRadius} />
            </clipPath>
          </defs>

          <circle
            className="instrumentGuide instrumentGuideOuter"
            cx={CENTRE}
            cy={CENTRE}
            r={OUTER_RADIUS + 18}
          />

          <g className="instrumentSectors">
            {SUNSET_COLOUR_TAXONOMY.map((sector) => {
              const centreAngle =
                ANGLE_OFFSET + sector.chromaticAngle;
              const startAngle = centreAngle - SECTOR_ANGLE / 2;
              const endAngle = centreAngle + SECTOR_ANGLE / 2;
              const isSelectedSector = sector.id === selectedSectorId;

              return (
                <path
                  aria-label={`${sector.code}, ${sector.name}, ${sector.family}, representative colour ${sector.representativeHex}`}
                  aria-pressed={isSelectedSector}
                  className={
                    isSelectedSector
                      ? "instrumentSector instrumentSectorSelected"
                      : "instrumentSector"
                  }
                  d={createAnnularSectorPath({
                    centreX: CENTRE,
                    centreY: CENTRE,
                    innerRadius,
                    outerRadius: OUTER_RADIUS,
                    startAngle,
                    endAngle,
                  })}
                  fill={sector.representativeHex}
                  id={`instrument-sector-${sector.id}`}
                  key={sector.id}
                  onBlur={() => setPreviewSectorId(null)}
                  onClick={() => setSelectedSectorId(sector.id)}
                  onFocus={() => {
                    setFocusedSectorId(sector.id);
                    setPreviewSectorId(sector.id);
                  }}
                  onKeyDown={(event) =>
                    handleSectorKeyDown(event, sector.index, sector.id)
                  }
                  onMouseEnter={() => setPreviewSectorId(sector.id)}
                  onMouseLeave={() => setPreviewSectorId(null)}
                  role="button"
                  tabIndex={sector.id === focusedSectorId ? 0 : -1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>

          <circle
            className="instrumentGuide instrumentInnerBoundary"
            cx={CENTRE}
            cy={CENTRE}
            r={innerRadius}
          />
          <circle
            className="instrumentOpening"
            cx={CENTRE}
            cy={CENTRE}
            r={viewerRadius}
          />

          {displayed && displayedImageStatus !== "error" ? (
            <g className="instrumentViewer" pointerEvents="none">
              <image
                aria-hidden="true"
                className="instrumentViewerImage"
                clipPath="url(#sunsetometer-viewer-clip)"
                height={viewerRadius * 2}
                href={displayed.sunset.image}
                key={displayed.sunset.id}
                onError={() =>
                  setViewerImageState({
                    id: displayed.sunset.id,
                    status: "error",
                  })
                }
                onLoad={() =>
                  setViewerImageState({
                    id: displayed.sunset.id,
                    status: "loaded",
                  })
                }
                preserveAspectRatio="xMidYMid slice"
                width={viewerRadius * 2}
                x={CENTRE - viewerRadius}
                y={CENTRE - viewerRadius}
              />
            </g>
          ) : null}

          {displayed && displayedImageStatus !== "loaded" ? (
            <g
              aria-hidden="true"
              className="instrumentViewerStatus"
              pointerEvents="none"
              textAnchor="middle"
            >
              <text x={CENTRE} y={CENTRE - 4}>
                {displayedImageStatus === "error"
                  ? "Image unavailable"
                  : "Loading photograph"}
              </text>
              <text
                className="instrumentViewerStatusDetail"
                x={CENTRE}
                y={CENTRE + 24}
              >
                {displayedImageStatus === "error"
                  ? "Classification remains available"
                  : "Preparing specimen viewer"}
              </text>
            </g>
          ) : null}

          <circle
            aria-hidden="true"
            className="instrumentViewerRim"
            cx={CENTRE}
            cy={CENTRE}
            r={viewerRadius}
            vectorEffect="non-scaling-stroke"
          />

          <g aria-hidden="true" className="instrumentScale">
            {SUNSET_COLOUR_TAXONOMY.map((sector) => {
              const angle = ANGLE_OFFSET + sector.chromaticAngle;
              const tickInner = pointOnCircle({
                centreX: CENTRE,
                centreY: CENTRE,
                radius: OUTER_RADIUS + 8,
                angle,
              });
              const tickOuter = pointOnCircle({
                centreX: CENTRE,
                centreY: CENTRE,
                radius:
                  OUTER_RADIUS + (sector.index % 5 === 0 ? 27 : 19),
                angle,
              });
              const label = pointOnCircle({
                centreX: CENTRE,
                centreY: CENTRE,
                radius: LABEL_RADIUS,
                angle,
              });
              const familyLabel = pointOnCircle({
                centreX: CENTRE,
                centreY: CENTRE,
                radius: FAMILY_LABEL_RADIUS,
                angle,
              });
              const perimeterLabel = PERIMETER_LABELS.get(sector.id);

              return (
                <g key={sector.id}>
                  <line
                    className={
                      sector.index % 5 === 0
                        ? "instrumentTick instrumentTickMajor"
                        : "instrumentTick"
                    }
                    vectorEffect="non-scaling-stroke"
                    x1={tickInner.x}
                    x2={tickOuter.x}
                    y1={tickInner.y}
                    y2={tickOuter.y}
                  />
                  <text
                    className={
                      sector.index % 5 === 0
                        ? "instrumentCode instrumentCodeMajor"
                        : "instrumentCode"
                    }
                    dominantBaseline="middle"
                    textAnchor="middle"
                    transform={`translate(${label.x} ${label.y}) rotate(${readableTangentialRotation(angle)})`}
                  >
                    {sector.code}
                  </text>
                  {perimeterLabel ? (
                    <text
                      className="instrumentFamilyLabel"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      transform={`translate(${familyLabel.x} ${familyLabel.y}) rotate(${readableTangentialRotation(angle)})`}
                    >
                      {sector.code} — {perimeterLabel}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>

          <g className="sunsetMarkers">
            {showObservationLine && selected ? (
              <line
                aria-hidden="true"
                className="observationConnector"
                x1={selected.displayPosition.displayX}
                y1={selected.displayPosition.displayY}
                x2={
                  CENTRE +
                  ((selected.displayPosition.displayX - CENTRE) /
                    Math.hypot(
                      selected.displayPosition.displayX - CENTRE,
                      selected.displayPosition.displayY - CENTRE,
                    )) *
                    viewerRadius
                }
                y2={
                  CENTRE +
                  ((selected.displayPosition.displayY - CENTRE) /
                    Math.hypot(
                      selected.displayPosition.displayX - CENTRE,
                      selected.displayPosition.displayY - CENTRE,
                    )) *
                    viewerRadius
                }
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <g aria-hidden="true" className="sunsetMarkerLeaders">
              {positionedSunsets.filter(
                ({ displayPosition }) => displayPosition.isDisplaced,
              ).map(({ sunset, displayPosition }) => (
                <line
                  className="sunsetMarkerLeader"
                  key={sunset.id}
                  vectorEffect="non-scaling-stroke"
                  x1={displayPosition.trueX}
                  x2={displayPosition.displayX}
                  y1={displayPosition.trueY}
                  y2={displayPosition.displayY}
                />
              ))}
            </g>

            {positionedSunsets.map(
              ({ sunset, position, displayPosition }, index) => {
              const isSelected = sunset.id === selectedSunsetId;
              const collisionDescription =
                displayPosition.clusterSize > 1
                  ? `, visually separated from ${displayPosition.clusterSize - 1} nearby ${displayPosition.clusterSize === 2 ? "sunset" : "sunsets"}`
                  : "";

              return (
                <g
                  aria-label={`${sunset.displayName}, ${sunset.date}, ${sunset.location}, ${sunset.colourFamily}${collisionDescription}`}
                  aria-pressed={isSelected}
                  className="sunsetMarkerControl"
                  id={`instrument-marker-${sunset.id}`}
                  key={sunset.id}
                  onBlur={() => setPreviewId(null)}
                  onClick={() => {
                    onSelect(sunset.id);
                    setSelectedSectorId(position.sectorId);
                  }}
                  onFocus={() => {
                    setFocusedId(sunset.id);
                    setPreviewId(sunset.id);
                  }}
                  onKeyDown={(event) =>
                    handleMarkerKeyDown(event, index, sunset, position.sectorId)
                  }
                  onMouseEnter={() => setPreviewId(sunset.id)}
                  onMouseLeave={() => setPreviewId(null)}
                  role="button"
                  tabIndex={
                    sunset.id === focusedId ||
                    (focusedId === "" && index === 0)
                      ? 0
                      : -1
                  }
                >
                  <circle
                    aria-hidden="true"
                    className="sunsetMarkerHitArea"
                    cx={displayPosition.displayX}
                    cy={displayPosition.displayY}
                    r={MARKER_HIT_RADIUS}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    aria-hidden="true"
                    className={
                      isSelected
                        ? "sunsetMarker sunsetMarkerSelected"
                        : "sunsetMarker"
                    }
                    cx={displayPosition.displayX}
                    cy={displayPosition.displayY}
                    r={isSelected ? SELECTED_MARKER_RADIUS : MARKER_RADIUS}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    aria-hidden="true"
                    className="sunsetMarkerFocusRing"
                    cx={displayPosition.displayX}
                    cy={displayPosition.displayY}
                    r={18}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            },
            )}

            {selected ? (
              <circle
                aria-hidden="true"
                className="sunsetMarkerSelectionRing"
                cx={selected.displayPosition.displayX}
                cy={selected.displayPosition.displayY}
                r={13}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </g>

          {!displayed ? (
            <g className="instrumentCentreLabel" textAnchor="middle">
              <text x={CENTRE} y={CENTRE - 11}>
                Select a sunset
              </text>
              <line
                vectorEffect="non-scaling-stroke"
                x1={CENTRE - 42}
                x2={CENTRE + 42}
                y1={CENTRE + 15}
                y2={CENTRE + 15}
              />
              <text
                className="instrumentCentreSubline"
                x={CENTRE}
                y={CENTRE + 45}
              >
                Choose an observation
              </text>
            </g>
          ) : null}
          </svg>
          <p aria-live="polite" className="visuallyHidden">
            {selected
              ? `Selected ${selected.sunset.displayName}, ${selected.sunset.date}, ${selected.sunset.location}. Image ${displayedImageStatus}.`
              : "No sunset selected."}
          </p>
          </div>
        ) : (
          <SunsetAtlasView
            apertureScale={apertureScale}
            centreXFraction={atlasPosition}
            displayedSunset={displayed?.sunset}
            focusedMarkerId={focusedId}
            focusedSectorId={focusedSectorId}
            highlightedSectorId={activeSectorId}
            onMarkerFocus={setFocusedId}
            onMarkerKeyDown={(event, index, sunset) => {
              const sector = SUNSET_COLOUR_TAXONOMY.find(
                (candidate) =>
                  candidate.code === sunset.classification.sectorId,
              );

              if (sector) {
                handleMarkerKeyDown(event, index, sunset, sector.id);
              }
            }}
            onMarkerPreview={setPreviewId}
            onSelect={(sunset) => {
              const sector = SUNSET_COLOUR_TAXONOMY.find(
                (candidate) =>
                  candidate.code === sunset.classification.sectorId,
              );
              onSelect(sunset.id);
              setSelectedSectorId(sector?.id ?? null);
            }}
            onSectorFocus={setFocusedSectorId}
            onSectorKeyDown={handleSectorKeyDown}
            onSectorPreview={setPreviewSectorId}
            onSectorSelect={setSelectedSectorId}
            selectedSunsetId={selectedSunsetId}
            selectedSectorId={selectedSectorId}
            showObservationLine={showObservationLine}
            sunsets={sunsets}
          />
        )}
        <div className="instrumentDetails">
          <div
            aria-live="polite"
            className={
              activeSector
                ? "instrumentSectorReadout"
                : "instrumentSectorReadout instrumentSectorReadoutEmpty"
            }
          >
            {activeSector ? (
              <>
                <span
                  aria-hidden="true"
                  className="instrumentSectorSwatch"
                  style={{ backgroundColor: activeSector.representativeHex }}
                />
                <p>
                  <strong>{activeSector.code}</strong>
                  <span>{activeSector.name}</span>
                </p>
                <dl>
                  <div>
                    <dt>Family</dt>
                    <dd>{activeSector.family}</dd>
                  </div>
                  <div>
                    <dt>Representative colour</dt>
                    <dd>{activeSector.representativeHex}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p>Hover, focus or select a sector to read its classification.</p>
            )}
          </div>
          {activeCluster.length > 1 ? (
            <div className="instrumentClusterChooser">
              <p>Nearby observations</p>
              <div>
                {activeCluster.map(({ sunset, position }) => (
                  <button
                    aria-pressed={sunset.id === selectedSunsetId}
                    key={sunset.id}
                    onClick={() => {
                      onSelect(sunset.id);
                      setSelectedSectorId(position.sectorId);
                    }}
                    type="button"
                  >
                    {sunset.displayName}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <SelectedSunsetPanel
            onRename={onRename}
            sunset={selected?.sunset}
            variant={viewMode === "atlas" ? "atlas" : "default"}
          />
        </div>
      </div>
    </section>
  );
}

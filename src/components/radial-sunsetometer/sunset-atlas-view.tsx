import type { KeyboardEvent } from "react";

import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { SUNSET_COLOUR_TAXONOMY } from "@/domain/sunset-colour-taxonomy";
import {
  ATLAS_PAPER_HEX,
  getAtlasDisplayColour,
} from "@/lib/colour-analysis/atlas-display-colour";
import {
  createAnnularSectorPath,
  pointOnCircle,
} from "@/lib/radial-geometry";

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 760;
const BASE_VIEWER_RADIUS = 184;
const OUTER_RADIUS = 1500;
const ANGLE_OFFSET = -90;
const SECTOR_ANGLE = 360 / SUNSET_COLOUR_TAXONOMY.length;
const EDGE_INSET = 28;
const MARKER_RADIUS = 7.2;
const MARKER_SELECTION_RADIUS = 15.6;
const MARKER_FOCUS_RADIUS = 16.8;

type SunsetAtlasViewProps = {
  apertureScale: number;
  centreXFraction: number;
  displayedSunset?: AnalysedSunset;
  focusedMarkerId: string;
  focusedSectorId: string;
  onMarkerFocus: (sunsetId: string) => void;
  onMarkerKeyDown: (
    event: KeyboardEvent<SVGGElement>,
    index: number,
    sunset: AnalysedSunset,
  ) => void;
  onMarkerPreview: (sunsetId: string | null) => void;
  onSelect: (sunset: AnalysedSunset) => void;
  onSectorFocus: (sectorId: string) => void;
  onSectorKeyDown: (
    event: KeyboardEvent<SVGGElement>,
    sectorIndex: number,
    sectorId: string,
  ) => void;
  onSectorPreview: (sectorId: string | null) => void;
  onSectorSelect: (sectorId: string) => void;
  highlightedSectorId: string | null;
  selectedSunsetId: string | null;
  selectedSectorId: string | null;
  showObservationLine: boolean;
  sunsets: readonly AnalysedSunset[];
};

function distanceToFieldEdge(
  angle: number,
  centreX: number,
  centreY: number,
  inset = EDGE_INSET,
) {
  const radians = (angle * Math.PI) / 180;
  const directionX = Math.cos(radians);
  const directionY = Math.sin(radians);
  const minimumX = inset;
  const maximumX = VIEWBOX_WIDTH - inset;
  const minimumY = inset;
  const maximumY = VIEWBOX_HEIGHT - inset;
  const horizontalDistance =
    directionX > 0
      ? (maximumX - centreX) / directionX
      : directionX < 0
        ? (minimumX - centreX) / directionX
        : Number.POSITIVE_INFINITY;
  const verticalDistance =
    directionY > 0
      ? (maximumY - centreY) / directionY
      : directionY < 0
        ? (minimumY - centreY) / directionY
        : Number.POSITIVE_INFINITY;

  return Math.min(horizontalDistance, verticalDistance);
}

function atlasPoint(
  angle: number,
  normalisedRadius: number,
  centreX: number,
  centreY: number,
  innerRadius: number,
) {
  const edgeDistance = distanceToFieldEdge(angle, centreX, centreY, 42);
  const radius =
    innerRadius + normalisedRadius * (edgeDistance - innerRadius);

  return pointOnCircle({
    centreX,
    centreY,
    radius,
    angle,
  });
}

export function SunsetAtlasView({
  apertureScale,
  centreXFraction,
  displayedSunset,
  focusedMarkerId,
  focusedSectorId,
  onMarkerFocus,
  onMarkerKeyDown,
  onMarkerPreview,
  onSelect,
  onSectorFocus,
  onSectorKeyDown,
  onSectorPreview,
  onSectorSelect,
  highlightedSectorId,
  selectedSunsetId,
  selectedSectorId,
  showObservationLine,
  sunsets,
}: SunsetAtlasViewProps) {
  const centreX = VIEWBOX_WIDTH * centreXFraction;
  const centreY = VIEWBOX_HEIGHT * 0.5;
  const viewerRadius = BASE_VIEWER_RADIUS * apertureScale;
  const innerRadius = viewerRadius + 4;
  const sunsetsBySector = new Map<string, AnalysedSunset[]>();

  for (const sunset of sunsets) {
    const sectorSunsets =
      sunsetsBySector.get(sunset.classification.sectorId) ?? [];
    sectorSunsets.push(sunset);
    sunsetsBySector.set(
      sunset.classification.sectorId,
      sectorSunsets.sort((first, second) => first.id.localeCompare(second.id)),
    );
  }
  const selectedSunset = sunsets.find(
    (sunset) => sunset.id === selectedSunsetId,
  );
  const selectedPoint = selectedSunset
    ? atlasPoint(
        ANGLE_OFFSET + selectedSunset.classification.angle,
        selectedSunset.classification.radialPosition,
        centreX,
        centreY,
        innerRadius,
      )
    : null;

  return (
    <div className="atlasScroll" role="region" aria-label="Sunset colour atlas">
      <svg
        aria-labelledby="sunset-atlas-title sunset-atlas-description"
        className="atlasSvg"
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="sunset-atlas-title">Sunsetometer colour atlas</title>
        <desc id="sunset-atlas-description">
          Sixty sunset colours radiate across a rectangular comparison field
          from an off-centre circular photograph aperture. Observation angle
          represents colour sector and distance from the aperture represents
          chroma.
        </desc>
        <defs>
          <clipPath id="sunset-atlas-field-clip">
            <rect
              height={VIEWBOX_HEIGHT - EDGE_INSET * 2}
              width={VIEWBOX_WIDTH - EDGE_INSET * 2}
              x={EDGE_INSET}
              y={EDGE_INSET}
            />
          </clipPath>
          <clipPath id="sunset-atlas-viewer-clip">
            <circle cx={centreX} cy={centreY} r={viewerRadius} />
          </clipPath>
        </defs>

        <rect
          className="atlasFieldGround"
          fill={ATLAS_PAPER_HEX}
          height={VIEWBOX_HEIGHT}
          width={VIEWBOX_WIDTH}
          x={0}
          y={0}
        />

        <g
          className="atlasSectors"
          clipPath="url(#sunset-atlas-field-clip)"
        >
          {SUNSET_COLOUR_TAXONOMY.map((sector) => {
            const centreAngle = ANGLE_OFFSET + sector.chromaticAngle;
            const isSelected = selectedSectorId === sector.id;
            const isHighlighted = highlightedSectorId === sector.id;

            return (
              <path
                aria-label={`${sector.code}, ${sector.name}, ${sector.family}, representative colour ${sector.representativeHex}`}
                aria-pressed={isSelected}
                className={[
                  "atlasSector",
                  isSelected ? "atlasSectorSelected" : "",
                  isHighlighted ? "atlasSectorHighlighted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                d={createAnnularSectorPath({
                  centreX,
                  centreY,
                  innerRadius,
                  outerRadius: OUTER_RADIUS,
                  startAngle: centreAngle - SECTOR_ANGLE / 2,
                  endAngle: centreAngle + SECTOR_ANGLE / 2,
                })}
                fill={getAtlasDisplayColour(sector)}
                id={`instrument-sector-${sector.id}`}
                key={sector.id}
                onBlur={() => onSectorPreview(null)}
                onClick={() => onSectorSelect(sector.id)}
                onFocus={() => {
                  onSectorFocus(sector.id);
                  onSectorPreview(sector.id);
                }}
                onKeyDown={(event) =>
                  onSectorKeyDown(event, sector.index, sector.id)
                }
                onMouseEnter={() => onSectorPreview(sector.id)}
                onMouseLeave={() => onSectorPreview(null)}
                role="button"
                tabIndex={-1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        <g className="atlasPerimeterCodes">
          {SUNSET_COLOUR_TAXONOMY.map((sector) => {
            const angle = ANGLE_OFFSET + sector.chromaticAngle;
            const isSelected = selectedSectorId === sector.id;
            const isHighlighted = highlightedSectorId === sector.id;
            const labelPoint = pointOnCircle({
              centreX,
              centreY,
              radius: distanceToFieldEdge(angle, centreX, centreY, 10),
              angle,
            });

            return (
              <text
                aria-label={`${sector.code}, ${sector.name}, ${sector.family}`}
                aria-pressed={isSelected}
                className={[
                  "atlasPerimeterCode",
                  isSelected ? "atlasPerimeterCodeSelected" : "",
                  isHighlighted ? "atlasPerimeterCodeHighlighted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                dominantBaseline="middle"
                id={`instrument-sector-label-${sector.id}`}
                key={sector.id}
                onBlur={() => onSectorPreview(null)}
                onClick={() => onSectorSelect(sector.id)}
                onFocus={() => {
                  onSectorFocus(sector.id);
                  onSectorPreview(sector.id);
                }}
                onKeyDown={(event) =>
                  onSectorKeyDown(event, sector.index, sector.id)
                }
                onMouseEnter={() => onSectorPreview(sector.id)}
                onMouseLeave={() => onSectorPreview(null)}
                role="button"
                tabIndex={sector.id === focusedSectorId ? 0 : -1}
                textAnchor="middle"
                x={labelPoint.x}
                y={labelPoint.y}
              >
                {sector.code}
              </text>
            );
          })}
        </g>

        <g className="atlasMarkers">
          {showObservationLine && selectedPoint ? (
            <line
              aria-hidden="true"
              className="observationConnector observationConnectorAtlas"
              x1={selectedPoint.x}
              y1={selectedPoint.y}
              x2={
                centreX +
                ((selectedPoint.x - centreX) /
                  Math.hypot(
                    selectedPoint.x - centreX,
                    selectedPoint.y - centreY,
                  )) *
                  viewerRadius
              }
              y2={
                centreY +
                ((selectedPoint.y - centreY) /
                  Math.hypot(
                    selectedPoint.x - centreX,
                    selectedPoint.y - centreY,
                  )) *
                  viewerRadius
              }
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {sunsets.map((sunset, index) => {
            const sector = SUNSET_COLOUR_TAXONOMY.find(
              (candidate) =>
                candidate.code === sunset.classification.sectorId,
            );

            if (!sector) {
              return null;
            }

            const angle = ANGLE_OFFSET + sunset.classification.angle;
            const point = atlasPoint(
              angle,
              sunset.classification.radialPosition,
              centreX,
              centreY,
              innerRadius,
            );
            const sectorSunsets =
              sunsetsBySector.get(sunset.classification.sectorId) ?? [];
            const sectorIndex = sectorSunsets.findIndex(
              (candidate) => candidate.id === sunset.id,
            );
            const overlapOffset =
              (sectorIndex - (sectorSunsets.length - 1) / 2) * 7;
            const angleRadians = (angle * Math.PI) / 180;
            const x = point.x - Math.sin(angleRadians) * overlapOffset;
            const y = point.y + Math.cos(angleRadians) * overlapOffset;
            const isSelected = sunset.id === selectedSunsetId;

            return (
              <g
                aria-label={`${sunset.displayName}, ${sunset.date}, ${sunset.location}, ${sunset.colourFamily}`}
                aria-pressed={isSelected}
                className="atlasMarkerControl"
                id={`instrument-marker-${sunset.id}`}
                key={sunset.id}
                onBlur={() => onMarkerPreview(null)}
                onClick={() => onSelect(sunset)}
                onFocus={() => {
                  onMarkerFocus(sunset.id);
                  onMarkerPreview(sunset.id);
                }}
                onKeyDown={(event) => onMarkerKeyDown(event, index, sunset)}
                onMouseEnter={() => onMarkerPreview(sunset.id)}
                onMouseLeave={() => onMarkerPreview(null)}
                role="button"
                tabIndex={
                  sunset.id === focusedMarkerId ||
                  (focusedMarkerId === "" && index === 0)
                    ? 0
                    : -1
                }
              >
                <circle
                  aria-hidden="true"
                  className="atlasMarkerHitArea"
                  cx={x}
                  cy={y}
                  r={9}
                  vectorEffect="non-scaling-stroke"
                />
                {isSelected ? (
                  <circle
                    aria-hidden="true"
                    className="atlasMarkerSelectionRing"
                    cx={x}
                    cy={y}
                    r={MARKER_SELECTION_RADIUS}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
                <circle
                  aria-hidden="true"
                  className={
                    isSelected
                      ? "atlasMarker atlasMarkerSelected"
                      : "atlasMarker"
                  }
                  cx={x}
                  cy={y}
                  r={MARKER_RADIUS}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  aria-hidden="true"
                  className="atlasMarkerFocusRing"
                  cx={x}
                  cy={y}
                  r={MARKER_FOCUS_RADIUS}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </g>

        <circle
          className="atlasAperture"
          cx={centreX}
          cy={centreY}
          r={viewerRadius}
        />
        {displayedSunset ? (
          <image
            aria-hidden="true"
            className="atlasViewerImage"
            clipPath="url(#sunset-atlas-viewer-clip)"
            height={viewerRadius * 2}
            href={displayedSunset.image}
            preserveAspectRatio="xMidYMid slice"
            width={viewerRadius * 2}
            x={centreX - viewerRadius}
            y={centreY - viewerRadius}
          />
        ) : (
          <g
            aria-hidden="true"
            className="atlasApertureLabel"
            textAnchor="middle"
          >
            <text x={centreX} y={centreY - 4}>
              Select a sunset
            </text>
            <text
              className="atlasApertureSubline"
              x={centreX}
              y={centreY + 23}
            >
              Choose an observation
            </text>
          </g>
        )}
        <circle
          aria-hidden="true"
          className="atlasApertureRim"
          cx={centreX}
          cy={centreY}
          r={viewerRadius}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          aria-hidden="true"
          className="atlasCardBorder"
          height={VIEWBOX_HEIGHT - EDGE_INSET * 2}
          width={VIEWBOX_WIDTH - EDGE_INSET * 2}
          x={EDGE_INSET}
          y={EDGE_INSET}
        />
      </svg>
      {process.env.NODE_ENV === "development" ? (
        <details className="atlasPaletteDebug">
          <summary>Development: compare canonical and Atlas colours</summary>
          <div>
            {SUNSET_COLOUR_TAXONOMY.map((sector) => (
              <figure key={sector.id}>
                <span>{sector.code}</span>
                <i style={{ backgroundColor: sector.representativeHex }} />
                <i style={{ backgroundColor: getAtlasDisplayColour(sector) }} />
              </figure>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

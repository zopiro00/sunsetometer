"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopologyJson from "world-atlas/countries-110m.json";
import landTopologyJson from "world-atlas/land-110m.json";

import {
  CloudFieldDisplayControls,
  type CloudDisplaySettings,
  type CloudLayerChoice,
} from "@/components/atmosphere/cloud-field-display-controls";

import type {
  ApproximateMapLocation,
  CloudFieldData,
} from "@/domain/cloud-field";
import {
  cloudFieldGridAxes,
  destinationPoint,
  isValidCloudField,
  normaliseCloudAmount,
  projectCloudCoordinate,
} from "@/lib/cloud-field";
import { nasaGibsSatelliteImage } from "@/services/weather";

type CloudFieldMapProps = {
  location: ApproximateMapLocation | null;
  cloudData?: CloudFieldData | null;
  mode?: "cloud" | "satellite";
  satelliteDate?: string | null;
  unavailableMessage?: string;
};

const topology = landTopologyJson as Topology<{
  land: GeometryCollection;
}>;
const landGeoJson = feature(topology, topology.objects.land);
const countriesTopology = countriesTopologyJson as unknown as Topology<{
  countries: GeometryCollection;
  land: GeometryCollection;
}>;
const countriesGeoJson = feature(
  countriesTopology,
  countriesTopology.objects.countries,
);
const CLOUD_DISPLAY_SESSION_KEY = "sunsetometer-cloud-display-v3";
const defaultCloudDisplaySettings: CloudDisplaySettings = {
  baseMap: "on",
  markOpacity: 78,
  markSize: 100,
  mapOpacity: 100,
  showSolarDirection: true,
  showGrid: false,
  showLabels: true,
  cloudLayer: "total",
};

type BoundaryGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

function expandedBounds(bounds: CloudFieldData["bounds"]): CloudFieldData["bounds"] {
  const [west, south, east, north] = bounds;
  const longitudeMargin = (east - west) * 0.28;
  const latitudeMargin = (north - south) * 0.28;
  return [
    west - longitudeMargin,
    south - latitudeMargin,
    east + longitudeMargin,
    north + latitudeMargin,
  ];
}

function cloudCellFill(value: number, units: string, contrastPercent: number): string {
  const amount = normaliseCloudAmount(value, units);
  const weighted = Math.min(1, Math.max(0, 0.5 + (amount - 0.5) * contrastPercent / 100));
  return `hsl(${(215 + weighted * 18).toFixed(1)} ${(12 + weighted * 16).toFixed(1)}% ${(88 - weighted * 48).toFixed(1)}%)`;
}

function boundaryPaths(bounds: CloudFieldData["bounds"]): string[] {
  const [west, south, east, north] = bounds;
  const features = (countriesGeoJson as unknown as {
    features: { geometry: BoundaryGeometry | null }[];
  }).features;

  return features.flatMap(({ geometry }) => {
    if (!geometry) return [];
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : geometry.coordinates as number[][][][];

    return polygons.flatMap((polygon) => polygon.flatMap((ring) => {
      const longitudes = ring.map(([longitude]) => longitude);
      const latitudes = ring.map(([, latitude]) => latitude);
      if (
        Math.max(...longitudes) < west || Math.min(...longitudes) > east ||
        Math.max(...latitudes) < south || Math.min(...latitudes) > north
      ) return [];

      return [ring.map(([longitude, latitude], index) => {
        const point = projectCloudCoordinate(longitude, latitude, bounds);
        return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }).join(" ") + " Z"];
    }));
  });
}

function cloudRasterCanvas(
  data: CloudFieldData,
  contrastPercent: number,
): HTMLCanvasElement {
  const width = data.grid[0].length;
  const height = data.grid.length;
  const contrast = contrastPercent / 100;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) return canvas;

  context.imageSmoothingEnabled = false;
  data.grid.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === null) {
        context.clearRect(x, y, 1, 1);
        return;
      }

      const amount = normaliseCloudAmount(value, data.units);
      const weighted = Math.min(1, Math.max(0, 0.5 + (amount - 0.5) * contrast));
      const lightness = 88 - weighted * 48;
      const saturation = 12 + weighted * 16;
      const hue = 215 + weighted * 18;

      context.fillStyle = `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
      context.fillRect(x, y, 1, 1);
    });
  });

  return canvas;
}

function availableCloudLayers(data: CloudFieldData | null): ReadonlySet<CloudLayerChoice> {
  const variable = data?.variable.toLowerCase() ?? "";
  const available = new Set<CloudLayerChoice>();

  if (variable.includes("high")) available.add("high");
  else if (variable.includes("mid")) available.add("middle");
  else if (variable.includes("low")) available.add("low");
  else if (data) available.add("total");

  return available;
}

export function CloudFieldMap({
  location,
  cloudData = null,
  mode = "cloud",
  satelliteDate = null,
  unavailableMessage = "Regional cloud field unavailable. No gridded reanalysis or satellite dataset is connected.",
}: CloudFieldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    location ? "loading" : "ready",
  );
  const [displaySettings, setDisplaySettings] = useState(defaultCloudDisplaySettings);
  const displaySettingsLoaded = useRef(false);
  const validCloudData = cloudData && isValidCloudField(cloudData)
    ? cloudData
    : null;
  const satelliteImage = useMemo(
    () => location && satelliteDate
      ? nasaGibsSatelliteImage(location, satelliteDate)
      : null,
    [location, satelliteDate],
  );
  const cloudGridAxes = useMemo(
    () => validCloudData ? cloudFieldGridAxes(validCloudData) : null,
    [validCloudData],
  );
  const displayBounds = useMemo(
    () => validCloudData ? expandedBounds(validCloudData.bounds) : null,
    [validCloudData],
  );
  const mapBoundaryPaths = useMemo(
    () => displayBounds ? boundaryPaths(displayBounds) : [],
    [displayBounds],
  );
  const availableLayers = useMemo(
    () => availableCloudLayers(validCloudData),
    [validCloudData],
  );
  const activeCloudLayer = availableLayers.has(displaySettings.cloudLayer)
    ? displaySettings.cloudLayer
    : availableLayers.values().next().value ?? "total";

  useEffect(() => {
    const storedSettings = window.sessionStorage.getItem(CLOUD_DISPLAY_SESSION_KEY);
    if (!storedSettings) {
      displaySettingsLoaded.current = true;
      return;
    }

    let restoredSettings: CloudDisplaySettings;
    try {
      restoredSettings = {
        ...defaultCloudDisplaySettings,
        ...JSON.parse(storedSettings) as Partial<CloudDisplaySettings>,
      };
    } catch {
      window.sessionStorage.removeItem(CLOUD_DISPLAY_SESSION_KEY);
      displaySettingsLoaded.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      displaySettingsLoaded.current = true;
      setDisplaySettings(restoredSettings);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!displaySettingsLoaded.current) return;
    window.sessionStorage.setItem(
      CLOUD_DISPLAY_SESSION_KEY,
      JSON.stringify(displaySettings),
    );
  }, [displaySettings]);

  useEffect(() => {
    if (!location || !mapContainer.current) {
      return;
    }

    const mapLocation = location;
    let disposed = false;
    let configured = false;
    let map: import("maplibre-gl").Map | undefined;

    async function initialiseMap() {
      try {
        const maplibre = await import("maplibre-gl");

        if (disposed || !mapContainer.current) {
          return;
        }

        map = new maplibre.Map({
          container: mapContainer.current,
          center: [mapLocation.longitude, mapLocation.latitude],
          zoom: mapLocation.precision === "region" ? 4.8 : 6.1,
          interactive: false,
          attributionControl: false,
          renderWorldCopies: false,
          style: {
            version: 8,
            sources: {
              land: {
                type: "geojson",
                data: landGeoJson,
              },
              countries: {
                type: "geojson",
                data: countriesGeoJson,
              },
            },
            layers: [
              {
                id: "sea",
                type: "background",
                paint: { "background-color": "rgba(217, 215, 207, 0)" },
              },
              {
                id: "land",
                type: "fill",
                source: "land",
                paint: {
                  "fill-color": mode === "satellite"
                    ? "rgba(233, 224, 207, 0.08)"
                    : displaySettings.baseMap === "on"
                      ? `rgba(233, 224, 207, ${0.28 * displaySettings.mapOpacity / 100})`
                      : "rgba(233, 224, 207, 0)",
                },
              },
              {
                id: "coastline",
                type: "line",
                source: "land",
                paint: {
                  "line-color": displaySettings.baseMap === "off"
                    ? "rgba(43, 36, 31, 0)"
                    : `rgba(43, 36, 31, ${0.72 * displaySettings.mapOpacity / 100})`,
                  "line-width": 1.1,
                },
              },
              {
                id: "country-boundaries",
                type: "line",
                source: "countries",
                paint: {
                  "line-color": displaySettings.baseMap === "off"
                    ? "rgba(43, 36, 31, 0)"
                    : `rgba(43, 36, 31, ${0.4 * displaySettings.mapOpacity / 100})`,
                  "line-dasharray": [3, 3],
                  "line-width": 0.75,
                },
              },
            ],
          },
        });
        map.addControl(
          new maplibre.ScaleControl({ maxWidth: 82, unit: "metric" }),
          "bottom-right",
        );

        const configureMap = () => {
          if (!map || disposed || configured || !map.isStyleLoaded()) {
            return;
          }
          configured = true;

          if (mode === "satellite" && satelliteDate) {
            const satellite = nasaGibsSatelliteImage(mapLocation, satelliteDate);
            map.fitBounds(
              [
                [satellite.bounds[0], satellite.bounds[1]],
                [satellite.bounds[2], satellite.bounds[3]],
              ],
              { animate: false, padding: 0 },
            );
          } else if (validCloudData) {
            const [west, south, east, north] = validCloudData.bounds;
            const longitudeMargin = (east - west) * 0.28;
            const latitudeMargin = (north - south) * 0.28;
            map.fitBounds([
              [west - longitudeMargin, south - latitudeMargin],
              [east + longitudeMargin, north + latitudeMargin],
            ], {
              animate: false,
              padding: 0,
            });
          }

          if (mode === "cloud" && validCloudData) {
            const [west, south, east, north] = validCloudData.bounds;
            map.addSource("cloud-field", {
              type: "canvas",
              canvas: cloudRasterCanvas(validCloudData, displaySettings.markSize),
              coordinates: [
                [west, north],
                [east, north],
                [east, south],
                [west, south],
              ],
              animate: false,
            });
            map.addLayer({
              id: "cloud-field",
              type: "raster",
              source: "cloud-field",
              paint: {
                "raster-fade-duration": 0,
                "raster-opacity": displaySettings.markOpacity / 100,
                "raster-resampling": "nearest",
              },
            }, "coastline");
          }

          map.addSource("observation", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [mapLocation.longitude, mapLocation.latitude],
              },
            },
          });
          map.addLayer({
            id: "observation-halo",
            type: "circle",
            source: "observation",
            paint: {
              "circle-color": "#f8f2e7",
              "circle-radius": 7,
              "circle-stroke-color": "#2b241f",
              "circle-stroke-width": 1.2,
            },
          });

          if (displaySettings.showSolarDirection && mapLocation.solarAzimuth !== undefined) {
            map.addSource("solar-direction", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [mapLocation.longitude, mapLocation.latitude],
                    destinationPoint(
                      mapLocation.longitude,
                      mapLocation.latitude,
                      mapLocation.solarAzimuth,
                    ),
                  ],
                },
              },
            });
            map.addLayer({
              id: "solar-direction",
              type: "line",
              source: "solar-direction",
              paint: {
                "line-color": "#a84f35",
                "line-dasharray": [2, 2],
                "line-width": 1.5,
              },
            });
          }

          setMapState("ready");
        };
        map.on("styledata", configureMap);
        const styleFallback = window.setTimeout(configureMap, 250);
        map.on("error", () => setMapState("error"));

        map.once("remove", () => window.clearTimeout(styleFallback));
      } catch {
        setMapState("error");
      }
    }

    void initialiseMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [
    displaySettings.baseMap,
    displaySettings.mapOpacity,
    displaySettings.markOpacity,
    displaySettings.showSolarDirection,
    displaySettings.markSize,
    location,
    mode,
    satelliteDate,
    validCloudData,
  ]);

  return (
    <figure className="cloudMapFigure">
      <div className="cloudMapFrame">
        {location ? (
          <>
            {mode === "satellite" && satelliteImage ? (
              // The dated WMS URL is already a provider-rendered raster and
              // must not be passed through Next.js image optimisation.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                aria-hidden="true"
                className="cloudMapSatelliteImage"
                src={satelliteImage.url}
              />
            ) : null}
            <div
              aria-hidden="true"
              className="cloudMapCanvas"
              ref={mapContainer}
            />
            {mode === "cloud" && validCloudData ? (
              <div className="cloudMapSamplesOverlay">
                {displayBounds ? (
                  <svg
                    aria-hidden="true"
                    className="cloudMapVectorFallback"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    {validCloudData.grid.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
                      if (value === null) return null;
                      const [west, south, east, north] = validCloudData.bounds;
                      const columns = row.length;
                      const rows = validCloudData.grid.length;
                      const cellWest = west + columnIndex * (east - west) / columns;
                      const cellEast = west + (columnIndex + 1) * (east - west) / columns;
                      const cellNorth = north - rowIndex * (north - south) / rows;
                      const cellSouth = north - (rowIndex + 1) * (north - south) / rows;
                      const topLeft = projectCloudCoordinate(cellWest, cellNorth, displayBounds);
                      const bottomRight = projectCloudCoordinate(cellEast, cellSouth, displayBounds);
                      return (
                        <rect
                          fill={cloudCellFill(value, validCloudData.units, displaySettings.markSize)}
                          fillOpacity={displaySettings.markOpacity / 100}
                          height={bottomRight.y - topLeft.y}
                          key={`${rowIndex}-${columnIndex}`}
                          width={bottomRight.x - topLeft.x}
                          x={topLeft.x}
                          y={topLeft.y}
                        />
                      );
                    }))}
                    {displaySettings.baseMap === "off" ? null : mapBoundaryPaths.map((path, index) => (
                      <path className="cloudMapBoundary" d={path} key={index} />
                    ))}
                    {displaySettings.showSolarDirection && location.solarAzimuth !== undefined ? (() => {
                      const start = projectCloudCoordinate(location.longitude, location.latitude, displayBounds);
                      const destination = destinationPoint(
                        location.longitude,
                        location.latitude,
                        location.solarAzimuth,
                      );
                      const end = projectCloudCoordinate(destination[0], destination[1], displayBounds);
                      return <line className="cloudMapFallbackSolar" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />;
                    })() : null}
                    {(() => {
                      const observation = projectCloudCoordinate(location.longitude, location.latitude, displayBounds);
                      return (
                        <g className="cloudMapFallbackObservation">
                          <circle cx={observation.x} cy={observation.y} r="1.4" />
                          <circle cx={observation.x} cy={observation.y} r="0.55" />
                        </g>
                      );
                    })()}
                  </svg>
                ) : null}
                {displaySettings.showGrid && cloudGridAxes ? (
                  <span className="cloudSampleGrid">
                    {cloudGridAxes.x.map((x) => (
                      <i className="cloudSampleGridVertical" key={`x-${x}`} style={{ left: `${x}%` }} />
                    ))}
                    {cloudGridAxes.y.map((y) => (
                      <i className="cloudSampleGridHorizontal" key={`y-${y}`} style={{ top: `${y}%` }} />
                    ))}
                  </span>
                ) : null}
              </div>
            ) : null}
            {displaySettings.showLabels ? (
              <span aria-hidden="true" className="cloudMapNorth">N</span>
            ) : null}
            {mode === "cloud" && validCloudData ? (
              <span className="cloudMapLegend">
                <span>Modelled cloud cover</span>
                <span aria-hidden="true" className="cloudMapLegendScale" />
                <span>0%</span>
                <span>100%</span>
                <span>Discrete retrieved cells · no interpolation</span>
              </span>
            ) : null}
            {mapState === "loading" && !validCloudData ? (
              <span className="cloudMapStatus">Drawing geography…</span>
            ) : null}
            {mapState === "error" ? (
              <span className="cloudMapStatus">Map rendering unavailable</span>
            ) : null}
            {mode === "cloud" ? (
              <CloudFieldDisplayControls
                availableLayers={availableLayers}
                onChange={setDisplaySettings}
                settings={{ ...displaySettings, cloudLayer: activeCloudLayer }}
              />
            ) : null}
          </>
        ) : (
          <div className="cloudMapEmpty">
            <span aria-hidden="true">○</span>
            <p>Location unavailable</p>
            <small>A map will appear when approximate location evidence exists.</small>
          </div>
        )}
      </div>
      <figcaption>
        {!location ? (
          <span>No geographical evidence is available for this photograph.</span>
        ) : mode === "satellite" && satelliteDate ? (
          <dl className="cloudMapMetadata cloudMapSatelliteMetadata">
            <div>
              <dt>Reference type</dt>
              <dd>Daytime satellite observation</dd>
            </div>
            <div>
              <dt>Date relation</dt>
              <dd>Same date · {satelliteDate}</dd>
            </div>
            <div>
              <dt>Acquisition timing</dt>
              <dd>Exact swath time unavailable · may differ from sunset</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>NASA GIBS · NOAA-20 VIIRS corrected reflectance</dd>
            </div>
            <div className="cloudMapScientificNote">
              <dt>Comparison status</dt>
              <dd>Reference only · not treated as simultaneous with the photograph</dd>
            </div>
          </dl>
        ) : validCloudData ? (
          <dl className="cloudMapMetadata">
            <div>
              <dt>Cloud timestamp</dt>
              <dd>{new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
              }).format(new Date(validCloudData.timestamp))} UTC</dd>
            </div>
            <div>
              <dt>From photograph</dt>
              <dd>{validCloudData.closestToCaptureMinutes === undefined
                ? "Unavailable"
                : `${validCloudData.closestToCaptureMinutes} min`}</dd>
            </div>
            <div>
              <dt>Effective sampling</dt>
              <dd>{validCloudData.spatialResolution ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{validCloudData.source} · {validCloudData.temporalResolution ?? "temporal resolution unavailable"}</dd>
            </div>
            <div className="cloudMapScientificNote">
              <dt>Data character</dt>
              <dd>ERA5 reanalysis · not a satellite observation</dd>
            </div>
          </dl>
        ) : (
          <span className="cloudMapUnavailable">
            {unavailableMessage}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

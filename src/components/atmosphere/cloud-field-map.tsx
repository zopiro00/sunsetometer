"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopologyJson from "world-atlas/land-110m.json";

import type {
  ApproximateMapLocation,
  CloudFieldData,
} from "@/domain/cloud-field";
import {
  cloudProvenanceLines,
  destinationPoint,
  isValidCloudField,
  normaliseCloudAmount,
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

function cloudRasterDataUrl(data: CloudFieldData): string {
  const width = data.grid[0].length;
  const height = data.grid.length;
  const cells = data.grid.flatMap((row, y) =>
    row.map((value, x) => {
      const amount = value === null ? 0 : normaliseCloudAmount(value, data.units);
      // A fixed neutral scale preserves the measured 0–100% relationship:
      // clear cells remain nearly transparent and overcast cells become a
      // cool, denser grey. Colour is intentionally not used as a weather-radar
      // category.
      const red = Math.round(246 - amount * 112);
      const green = Math.round(243 - amount * 101);
      const blue = Math.round(234 - amount * 82);
      const opacity = value === null ? 0 : 0.08 + amount * 0.84;

      return `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="rgb(${red} ${green} ${blue})" fill-opacity="${opacity.toFixed(3)}"/>`;
    }),
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><filter id="soft-field" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.32"/></filter><g filter="url(#soft-field)">${cells}</g></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
  const validCloudData = cloudData && isValidCloudField(cloudData)
    ? cloudData
    : null;
  const provenance = useMemo(
    () => validCloudData ? cloudProvenanceLines(validCloudData) : [],
    [validCloudData],
  );
  const satelliteImage = useMemo(
    () => location && satelliteDate
      ? nasaGibsSatelliteImage(location, satelliteDate)
      : null,
    [location, satelliteDate],
  );
  const cloudRaster = useMemo(
    () => validCloudData ? cloudRasterDataUrl(validCloudData) : null,
    [validCloudData],
  );

  useEffect(() => {
    if (!location || !mapContainer.current) {
      return;
    }

    const mapLocation = location;
    let disposed = false;
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
                    : "rgba(233, 224, 207, 0.18)",
                },
              },
              {
                id: "coastline",
                type: "line",
                source: "land",
                paint: {
                  "line-color": "rgba(43, 36, 31, 0.48)",
                  "line-width": 0.7,
                },
              },
            ],
          },
        });
        map.addControl(
          new maplibre.ScaleControl({ maxWidth: 82, unit: "metric" }),
          "bottom-right",
        );

        map.on("load", () => {
          if (!map || disposed) {
            return;
          }

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
            map.fitBounds([[west, south], [east, north]], {
              animate: false,
              padding: 0,
            });
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

          if (mapLocation.solarAzimuth !== undefined) {
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
        });
        map.on("error", () => setMapState("error"));
      } catch {
        setMapState("error");
      }
    }

    void initialiseMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [location, mode, satelliteDate, validCloudData]);

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
            {mode === "cloud" && cloudRaster ? (
              // This DOM raster is deliberate: some browsers do not composite
              // MapLibre image sources reliably in a WebGL canvas. Geography,
              // coastlines and observation marks remain MapLibre layers above.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                aria-hidden="true"
                className="cloudMapFieldImage"
                src={cloudRaster}
              />
            ) : null}
            <div aria-hidden="true" className="cloudMapCanvas" ref={mapContainer} />
            <svg
              aria-hidden="true"
              className="cloudMapObservationOverlay"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {location.solarAzimuth === undefined ? null : (
                <line
                  className="cloudMapSolarDirection"
                  x1="50"
                  x2={50 + Math.sin(location.solarAzimuth * Math.PI / 180) * 19}
                  y1="50"
                  y2={50 - Math.cos(location.solarAzimuth * Math.PI / 180) * 19}
                />
              )}
              <circle className="cloudMapObservationHalo" cx="50" cy="50" r="1.45" />
              <circle className="cloudMapObservationPoint" cx="50" cy="50" r="0.72" />
            </svg>
            <span aria-hidden="true" className="cloudMapNorth">N</span>
            <span className="cloudMapPlace">{location.placeName}</span>
            {mode === "cloud" && validCloudData ? (
              <span className="cloudMapLegend">
                <span>Cloud amount</span>
                <span aria-hidden="true" className="cloudMapLegendScale" />
                <span>0</span>
                <span>100%</span>
              </span>
            ) : null}
            {mapState === "loading" ? (
              <span className="cloudMapStatus">Drawing geography…</span>
            ) : null}
            {mapState === "error" ? (
              <span className="cloudMapStatus">Map rendering unavailable</span>
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
        {location ? (
          <>
            <span>Observation location · approximate {location.precision}</span>
            <span>
              Solar azimuth · {location.solarAzimuth === undefined
                ? "unavailable"
                : `${Math.round(location.solarAzimuth)}°`}
            </span>
          </>
        ) : (
          <span>No geographical evidence is available for this photograph.</span>
        )}
        {mode === "satellite" && satelliteDate ? (
          <span className="cloudMapProvenance">
            Satellite · NASA/NOAA-20 VIIRS · {satelliteDate} · daily daytime
            overpass · acquisition time varies across the swath
          </span>
        ) : validCloudData ? (
          <span className="cloudMapProvenance">{provenance.join(" · ")}</span>
        ) : (
          <span className="cloudMapUnavailable">
            {unavailableMessage}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

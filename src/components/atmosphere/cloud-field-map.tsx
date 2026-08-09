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

type CloudFieldMapProps = {
  location: ApproximateMapLocation | null;
  cloudData?: CloudFieldData | null;
};

const topology = landTopologyJson as Topology<{
  land: GeometryCollection;
}>;
const landGeoJson = feature(topology, topology.objects.land);

function cloudRasterDataUrl(data: CloudFieldData): string {
  const width = data.grid[0].length;
  const height = data.grid.length;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Cloud raster rendering is unavailable");
  }

  const image = context.createImageData(width, height);

  data.grid.forEach((row, y) => {
    row.forEach((value, x) => {
      const offset = (y * width + x) * 4;
      const amount = value === null ? 0 : normaliseCloudAmount(value, data.units);
      image.data[offset] = 242;
      image.data[offset + 1] = 238;
      image.data[offset + 2] = 226;
      image.data[offset + 3] = value === null ? 0 : Math.round(28 + amount * 112);
    });
  });
  context.putImageData(image, 0, 0);

  return canvas.toDataURL("image/png");
}

export function CloudFieldMap({
  location,
  cloudData = null,
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
                paint: { "background-color": "#d9d7cf" },
              },
              {
                id: "land",
                type: "fill",
                source: "land",
                paint: { "fill-color": "#e9e0cf" },
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

          if (validCloudData) {
            const [west, south, east, north] = validCloudData.bounds;
            map.addSource("cloud-field", {
              type: "image",
              url: cloudRasterDataUrl(validCloudData),
              coordinates: [
                [west, north],
                [east, north],
                [east, south],
                [west, south],
              ],
            });
            map.addLayer(
              {
                id: "cloud-field",
                type: "raster",
                source: "cloud-field",
                paint: {
                  "raster-opacity": 0.68,
                  "raster-resampling": "linear",
                },
              },
              "coastline",
            );
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
  }, [location, validCloudData]);

  return (
    <figure className="cloudMapFigure">
      <div className="cloudMapFrame">
        {location ? (
          <>
            <div aria-hidden="true" className="cloudMapCanvas" ref={mapContainer} />
            <span aria-hidden="true" className="cloudMapNorth">N</span>
            <span className="cloudMapPlace">{location.placeName}</span>
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
        {validCloudData ? (
          <span className="cloudMapProvenance">{provenance.join(" · ")}</span>
        ) : (
          <span className="cloudMapUnavailable">
            Regional cloud field unavailable. No gridded reanalysis or satellite
            dataset is connected; a single point value is not drawn as a field.
          </span>
        )}
      </figcaption>
    </figure>
  );
}

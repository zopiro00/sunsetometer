"use client";

import { useEffect, useMemo, useState } from "react";

import { CloudFieldMap } from "@/components/atmosphere/cloud-field-map";
import { approximateMapLocation } from "@/data/approximate-places";
import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { CloudFieldData } from "@/domain/cloud-field";
import { fetchOpenMeteoCloudField } from "@/services/weather";
import { sunsetDateToIso } from "@/services/weather/open-meteo-cloud-field";
import { solarAzimuth } from "@/lib/solar-position";

type AtmosphereView = "cloud" | "satellite";

type AtmosphereSectionProps = {
  selectedSunset: AnalysedSunset | undefined;
  cloudData?: CloudFieldData | null;
};

export function AtmosphereSection({
  selectedSunset,
  cloudData,
}: AtmosphereSectionProps) {
  const location = useMemo(
    () => selectedSunset?.approximateCoordinates
      ? {
          ...selectedSunset.approximateCoordinates,
          placeName: selectedSunset.location,
          precision: "region" as const,
          solarAzimuth: selectedSunset.captureTimestamp
            ? solarAzimuth({
                timestamp: selectedSunset.captureTimestamp,
                ...selectedSunset.approximateCoordinates,
              }) ?? undefined
            : undefined,
        }
      : selectedSunset
        ? approximateMapLocation(selectedSunset.location)
        : null,
    [selectedSunset],
  );
  const [view, setView] = useState<AtmosphereView>("cloud");
  const requestKey = selectedSunset && location
    ? `${selectedSunset.id}|${selectedSunset.captureTimestamp ?? selectedSunset.date}|${selectedSunset.minutesFromSunset ?? 0}|${location.latitude}|${location.longitude}`
    : null;
  const [requestState, setRequestState] = useState<{
    key: string;
    data: CloudFieldData | null;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (cloudData !== undefined || !selectedSunset || !location || !requestKey) {
      return;
    }

    const controller = new AbortController();

    void fetchOpenMeteoCloudField({
      location,
      date: selectedSunset.date,
      captureTimestamp: selectedSunset.captureTimestamp,
      minutesFromSunset: selectedSunset.minutesFromSunset,
      signal: controller.signal,
    }).then((field) => {
      setRequestState({ key: requestKey, data: field, error: false });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setRequestState({ key: requestKey, data: null, error: true });
    });

    return () => controller.abort();
  }, [cloudData, location, requestKey, selectedSunset]);

  const matchingRequest = requestState?.key === requestKey ? requestState : null;
  const resolvedCloudData = cloudData === undefined
    ? matchingRequest?.data ?? null
    : cloudData;
  const cloudStatus = cloudData !== undefined
    ? cloudData ? "ready" : "idle"
    : !requestKey
      ? "idle"
      : matchingRequest?.error
        ? "error"
        : matchingRequest?.data
          ? "ready"
          : "loading";
  const unavailableMessage = cloudStatus === "loading"
    ? "Loading regional ERA5 cloud reanalysis…"
    : cloudStatus === "error"
      ? "Regional cloud reanalysis could not be retrieved for this date and place."
      : "Regional cloud field unavailable until a dated observation with an approximate location is selected.";
  const satelliteDate = selectedSunset
    ? sunsetDateToIso(selectedSunset.date)
    : null;

  return (
    <section className="atmosphereSection" aria-labelledby="atmosphere-title">
      <header className="atmosphereHeading">
        <div>
          <p className="sectionLabel">Atmospheric context</p>
          <h2 id="atmosphere-title">Cloud map</h2>
        </div>
        <p>
          A geographical reading surface for the air around the observation,
          kept separate from colour measured directly in the photograph.
        </p>
      </header>

      <div className="atmosphereLayout">
        <CloudFieldMap
          cloudData={resolvedCloudData}
          location={location}
          mode={view}
          satelliteDate={satelliteDate}
          unavailableMessage={unavailableMessage}
        />

        <aside className="atmosphereEvidence" aria-label="Cloud map evidence">
          <fieldset>
            <legend>Source view</legend>
            <div aria-label="Cloud source view" className="cloudModeSwitch">
              <button
                aria-pressed={view === "cloud"}
                onClick={() => setView("cloud")}
                type="button"
              >Cloud field</button>
              <button
                aria-pressed={view === "satellite"}
                disabled={!location || !satelliteDate}
                onClick={() => setView("satellite")}
                type="button"
              >Satellite</button>
            </div>
            <small>Cloud field is reanalysis; Satellite is observed daytime imagery.</small>
          </fieldset>

          <div>
            <p className="evidenceLabel">Map evidence</p>
            <dl>
              <div>
                <dt>Photograph</dt>
                <dd>{selectedSunset?.displayName ?? "No sunset selected"}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{selectedSunset?.location ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>Cloud layer</dt>
                <dd>
                  {view === "satellite"
                    ? satelliteDate ? "NASA VIIRS satellite" : "Not available"
                    : cloudStatus === "loading"
                    ? "Retrieving…"
                    : resolvedCloudData
                      ? "ERA5 reanalysis"
                      : "Not available"}
                </dd>
              </div>
              {view === "cloud" && resolvedCloudData?.weather ? (
                <>
                  <div>
                    <dt>Air temperature</dt>
                    <dd>{resolvedCloudData.weather.temperatureCelsius === null
                      ? "Unavailable"
                      : `${resolvedCloudData.weather.temperatureCelsius.toFixed(1)} °C`}</dd>
                  </div>
                  <div>
                    <dt>Relative humidity</dt>
                    <dd>{resolvedCloudData.weather.relativeHumidityPercent === null
                      ? "Unavailable"
                      : `${Math.round(resolvedCloudData.weather.relativeHumidityPercent)}%`}</dd>
                  </div>
                  <div>
                    <dt>Surface pressure</dt>
                    <dd>{resolvedCloudData.weather.surfacePressureHectopascals === null
                      ? "Unavailable"
                      : `${Math.round(resolvedCloudData.weather.surfacePressureHectopascals)} hPa`}</dd>
                  </div>
                  <div>
                    <dt>Wind at 10 m</dt>
                    <dd>{resolvedCloudData.weather.windSpeedKilometresPerHour === null
                      ? "Unavailable"
                      : `${resolvedCloudData.weather.windSpeedKilometresPerHour.toFixed(1)} km/h`}</dd>
                  </div>
                  <div>
                    <dt>Precipitation</dt>
                    <dd>{resolvedCloudData.weather.precipitationMillimetres === null
                      ? "Unavailable"
                      : `${resolvedCloudData.weather.precipitationMillimetres.toFixed(1)} mm`}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>{resolvedCloudData.weather.visibilityMetres === null
                      ? "Unavailable"
                      : `${(resolvedCloudData.weather.visibilityMetres / 1000).toFixed(1)} km`}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>

          {view === "satellite" ? (
            <p className="atmosphereCaution">
              Satellite imagery: <a href="https://earthdata.nasa.gov/gibs" rel="noreferrer" target="_blank">NASA GIBS</a>,
              NOAA-20 VIIRS corrected reflectance. This is a daytime orbital
              observation from the capture date, not an image taken at sunset.
            </p>
          ) : (
            <p className="atmosphereCaution">
              Weather and cloud data: Copernicus ERA5 reanalysis, accessed through the public <a href="https://open-meteo.com/" rel="noreferrer" target="_blank">Open-Meteo</a> adapter.
              The regional field is sampled
              from multiple provider grid cells; it is not inferred from one point.
            </p>
          )}

          <p className="atmosphereCaution">
            Model and reanalysis fields describe estimated atmospheric state.
            They must never be presented as direct satellite observation.
          </p>
        </aside>
      </div>
    </section>
  );
}

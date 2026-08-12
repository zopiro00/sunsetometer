"use client";

import { useEffect, useMemo, useState } from "react";

import { CloudFieldMap } from "@/components/atmosphere/cloud-field-map";
import { CloudReading } from "@/components/atmosphere/cloud-reading";
import { LightReading } from "@/components/atmosphere/light-reading";
import { AtmosphereReading } from "@/components/atmosphere/atmosphere-reading";
import { AtmosphericTimeline } from "@/components/atmosphere/atmospheric-timeline";
import { AtmosphericInterpretationStrip } from "@/components/atmosphere/atmospheric-interpretation";
import { MovementReading } from "@/components/atmosphere/movement-reading";
import { approximateMapLocation } from "@/data/approximate-places";
import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { LocalAtmosphericTimeSeries } from "@/domain/atmospheric-time-series";
import type { CloudFieldData } from "@/domain/cloud-field";
import {
  fetchOpenMeteoAtmosphericTimeSeries,
  fetchOpenMeteoCloudField,
} from "@/services/weather";
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
    cloudField: CloudFieldData | null;
    timeSeries: LocalAtmosphericTimeSeries | null;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!selectedSunset || !location || !requestKey) {
      return;
    }

    const controller = new AbortController();

    const request = {
      location,
      date: selectedSunset.date,
      captureTimestamp: selectedSunset.captureTimestamp,
      minutesFromSunset: selectedSunset.minutesFromSunset,
      signal: controller.signal,
    };

    void Promise.all([
      cloudData === undefined
        ? fetchOpenMeteoCloudField(request)
        : Promise.resolve(cloudData),
      fetchOpenMeteoAtmosphericTimeSeries(request),
    ]).then(([cloudField, timeSeries]) => {
      setRequestState({
        key: requestKey,
        cloudField,
        timeSeries,
        error: false,
      });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setRequestState({
        key: requestKey,
        cloudField: null,
        timeSeries: null,
        error: true,
      });
    });

    return () => controller.abort();
  }, [cloudData, location, requestKey, selectedSunset]);

  const matchingRequest = requestState?.key === requestKey ? requestState : null;
  const resolvedCloudData = cloudData === undefined
    ? matchingRequest?.cloudField ?? null
    : cloudData;
  const timeSeries = matchingRequest?.timeSeries ?? null;
  const selectedAtmosphere = timeSeries?.selectedRecord ?? null;
  const cloudStatus = cloudData !== undefined
    ? cloudData ? "ready" : "idle"
    : !requestKey
      ? "idle"
      : matchingRequest?.error
        ? "error"
        : matchingRequest?.cloudField
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
          <p className="sectionLabel">Conditions surrounding this sunset</p>
          <h2 id="atmosphere-title">Atmosphere</h2>
        </div>
        <p className="atmosphereLocation">{selectedSunset?.location ?? "Approximate location unavailable"}</p>
      </header>

      <div className="atmospherePlate">
        <div className="atmosphereReadings">
          <LightReading
            location={location}
            selectedSunset={selectedSunset}
            timeSeries={timeSeries}
          />
          <CloudReading record={selectedAtmosphere} />
          <AtmosphereReading record={selectedAtmosphere} />
        </div>

        <div className="atmosphereSpatialEvidence">
          <div className="cloudFieldHeading">
            <h3>Cloud field</h3>
            <span>Modelled cloud cover · ERA5 reanalysis</span>
          </div>
          <CloudFieldMap
            cloudData={resolvedCloudData}
            location={location}
            mode={view}
            satelliteDate={satelliteDate}
            unavailableMessage={unavailableMessage}
          />
          <MovementReading record={selectedAtmosphere} />

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
              >Satellite reference</button>
            </div>
            <small>
              Cloud field is reanalysis. Satellite reference is a daytime
              observation from the same date; acquisition time may differ from sunset.
            </small>
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
                <dt>{view === "satellite" ? "Reference layer" : "Cloud layer"}</dt>
                <dd>
                  {view === "satellite"
                    ? satelliteDate ? "NASA/NOAA-20 VIIRS daytime reference" : "Not available"
                    : cloudStatus === "loading"
                    ? "Retrieving…"
                    : resolvedCloudData
                      ? "ERA5 reanalysis"
                      : "Not available"}
                </dd>
              </div>
            </dl>
          </div>

          {view === "satellite" ? (
            <p className="atmosphereCaution">
              Satellite reference: <a href="https://earthdata.nasa.gov/gibs" rel="noreferrer" target="_blank">NASA GIBS</a>,
              NOAA-20 VIIRS corrected reflectance. This is a daytime orbital
              observation from the same date. Its exact acquisition time for
              this displayed swath is not established and may differ from sunset;
              it is not treated as temporally simultaneous with the photograph.
            </p>
          ) : (
            <p className="atmosphereCaution">
              Weather and cloud data: Copernicus ERA5 reanalysis, accessed through the public <a href="https://open-meteo.com/" rel="noreferrer" target="_blank">Open-Meteo</a> adapter.
              The regional field is sampled
              from multiple provider grid cells; it is not inferred from one point.
            </p>
          )}

          {view === "cloud" ? (
            <p className="atmosphereCaution">
              Model and reanalysis fields describe estimated atmospheric state.
              They must never be presented as direct satellite observation.
            </p>
          ) : null}
          </aside>
        </div>
      </div>
      <AtmosphericTimeline
        selectedSunset={selectedSunset}
        timeSeries={timeSeries}
      />
      <AtmosphericInterpretationStrip
        atmosphericRecord={selectedAtmosphere}
        location={location}
        selectedSunset={selectedSunset}
        sunsetTimestamp={timeSeries?.sunsetTimestamp ?? null}
      />
    </section>
  );
}

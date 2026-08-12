import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { LocalAtmosphericTimeSeries } from "@/domain/atmospheric-time-series";
import type { ApproximateMapLocation } from "@/domain/cloud-field";
import { solarPosition, twilightPhase } from "@/lib/solar-position";

function localTime(timestamp: string | null, timeZone: string): string {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return "Unavailable";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(new Date(timestamp));
  } catch {
    return "Unavailable";
  }
}

function measurement(value: number | null, unit: string): string {
  return value === null ? "Unavailable" : `${Math.round(value)} ${unit}`;
}

export function LightReading({
  selectedSunset,
  timeSeries,
  location,
}: {
  selectedSunset: AnalysedSunset | undefined;
  timeSeries: LocalAtmosphericTimeSeries | null;
  location: ApproximateMapLocation | null;
}) {
  const sunsetTimestamp = timeSeries?.sunsetTimestamp ?? null;
  const fallbackCapture = sunsetTimestamp && selectedSunset?.minutesFromSunset !== undefined
    ? new Date(
        Date.parse(sunsetTimestamp) + selectedSunset.minutesFromSunset * 60_000,
      ).toISOString()
    : null;
  const captureTimestamp = selectedSunset?.captureTimestamp ?? fallbackCapture;
  const calculatedRelative = captureTimestamp && sunsetTimestamp
    ? Math.round(
        (Date.parse(captureTimestamp) - Date.parse(sunsetTimestamp)) / 60_000,
      )
    : null;
  const relativeMinutes = selectedSunset?.minutesFromSunset ?? calculatedRelative;
  const position = captureTimestamp && location
    ? solarPosition({ timestamp: captureTimestamp, ...location })
    : null;
  const record = timeSeries?.selectedRecord;
  const timeZone = timeSeries?.timeZone ?? "UTC";

  return (
    <section className="atmosphereGroup lightReading" aria-labelledby="light-title">
      <h3 id="light-title">Light</h3>
      <div className="lightPrimaryReadings">
        <div>
          <span>Photograph time</span>
          <strong>{localTime(captureTimestamp, timeZone)}</strong>
        </div>
        <div>
          <span>Sunset time</span>
          <strong>{localTime(sunsetTimestamp, timeZone)}</strong>
        </div>
        <div className="lightRelativeReading">
          <span>Relative to sunset</span>
          <strong>{relativeMinutes === null
            ? "Unavailable"
            : `${relativeMinutes >= 0 ? "+" : "−"}${Math.abs(relativeMinutes)} min`}</strong>
          {relativeMinutes === null ? null : (
            <small>{relativeMinutes === 0
              ? "at sunset"
              : relativeMinutes > 0 ? "after sunset" : "before sunset"}</small>
          )}
        </div>
      </div>
      <dl className="lightSecondaryReadings">
        <div><dt>Solar elevation</dt><dd>{measurement(position?.elevation ?? null, "°")}</dd></div>
        <div><dt>Solar azimuth</dt><dd>{measurement(position?.azimuth ?? null, "°")}</dd></div>
        <div><dt>Twilight phase</dt><dd>{twilightPhase(position?.elevation ?? null) ?? "Unavailable"}</dd></div>
        <div><dt>Direct radiation</dt><dd>{measurement(record?.values.directRadiationWattsPerSquareMetre ?? null, "W/m²")}</dd></div>
        <div><dt>Diffuse radiation</dt><dd>{measurement(record?.values.diffuseRadiationWattsPerSquareMetre ?? null, "W/m²")}</dd></div>
      </dl>
    </section>
  );
}

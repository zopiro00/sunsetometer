import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type {
  AtmosphericTimeRecord,
  AtmosphericValues,
  LocalAtmosphericTimeSeries,
} from "@/domain/atmospheric-time-series";
import { atmosphericTimelinePosition } from "@/lib/atmospheric-timeline";

type TimelineRow = {
  field: keyof AtmosphericValues;
  label: string;
  format: (value: number) => string;
  domain: readonly [number, number];
};

const ROWS: TimelineRow[] = [
  { field: "cloudCoverPercent", label: "Total cloud cover", format: (value) => `${Math.round(value)}%`, domain: [0, 100] },
  { field: "highCloudCoverPercent", label: "High clouds", format: (value) => `${Math.round(value)}%`, domain: [0, 100] },
  { field: "midCloudCoverPercent", label: "Mid clouds", format: (value) => `${Math.round(value)}%`, domain: [0, 100] },
  { field: "lowCloudCoverPercent", label: "Low clouds", format: (value) => `${Math.round(value)}%`, domain: [0, 100] },
  { field: "relativeHumidityPercent", label: "Humidity", format: (value) => `${Math.round(value)}%`, domain: [0, 100] },
  { field: "visibilityMetres", label: "Visibility", format: (value) => `${(value / 1000).toFixed(1)} km`, domain: [0, 50_000] },
  { field: "precipitationMillimetres", label: "Precipitation", format: (value) => `${value.toFixed(1)} mm`, domain: [0, 5] },
];

function timelineValueY(value: number, domain: readonly [number, number]): number {
  const [minimum, maximum] = domain;
  const normalised = Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
  return 78 - normalised * 56;
}

function timeLabel(timestamp: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(new Date(timestamp));
  } catch {
    return "Time unavailable";
  }
}

function relativeLabel(minutes: number): string {
  if (minutes === 0) return "Sunset";
  const hours = Math.abs(minutes) / 60;
  const amount = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${minutes < 0 ? "−" : "+"}${amount}h`;
}

function captureRelativeMinutes(
  sunsetTimestamp: string,
  sunset: AnalysedSunset | undefined,
): number | null {
  if (sunset?.minutesFromSunset !== undefined) return sunset.minutesFromSunset;
  if (!sunset?.captureTimestamp) return null;
  return Math.round(
    (Date.parse(sunset.captureTimestamp) - Date.parse(sunsetTimestamp)) / 60_000,
  );
}

function TimelinePoint({
  record,
  row,
}: {
  record: AtmosphericTimeRecord;
  row: TimelineRow;
}) {
  const position = atmosphericTimelinePosition(record.relativeMinutesFromSunset);
  const value = record.values[row.field];

  if (position === null) return null;

  return (
    <span
      className={`timelinePoint${value === null ? " timelinePointUnavailable" : ""}`}
      style={{
        left: `${position}%`,
        top: value === null ? "50%" : `${timelineValueY(value, row.domain)}%`,
      }}
      title={`${relativeLabel(record.relativeMinutesFromSunset)}: ${value === null ? "Unavailable" : row.format(value)}`}
    >
      <i aria-hidden="true" />
      <b>{value === null ? "—" : row.format(value)}</b>
    </span>
  );
}

function TimelineSlope({
  records,
  row,
}: {
  records: readonly AtmosphericTimeRecord[];
  row: TimelineRow;
}) {
  return (
    <svg aria-hidden="true" className="timelineSlope" preserveAspectRatio="none" viewBox="0 0 100 100">
      {records.slice(0, -1).map((record, index) => {
        const nextRecord = records[index + 1];
        const x1 = atmosphericTimelinePosition(record.relativeMinutesFromSunset);
        const x2 = atmosphericTimelinePosition(nextRecord.relativeMinutesFromSunset);
        const value1 = record.values[row.field];
        const value2 = nextRecord.values[row.field];

        if (x1 === null || x2 === null || value1 === null || value2 === null) {
          return null;
        }

        return (
          <line
            key={`${record.timestamp}-${nextRecord.timestamp}`}
            x1={x1}
            x2={x2}
            y1={timelineValueY(value1, row.domain)}
            y2={timelineValueY(value2, row.domain)}
          />
        );
      })}
    </svg>
  );
}

export function AtmosphericTimeline({
  selectedSunset,
  timeSeries,
}: {
  selectedSunset: AnalysedSunset | undefined;
  timeSeries: LocalAtmosphericTimeSeries | null;
}) {
  const records = timeSeries?.records ?? [];
  const sunsetPosition = atmosphericTimelinePosition(0) ?? 60;
  const captureRelative = timeSeries
    ? captureRelativeMinutes(timeSeries.sunsetTimestamp, selectedSunset)
    : null;
  const capturePosition = captureRelative === null
    ? null
    : atmosphericTimelinePosition(captureRelative);
  const captureTimestamp = selectedSunset?.captureTimestamp ?? (
    timeSeries && selectedSunset?.minutesFromSunset !== undefined
      ? new Date(
          Date.parse(timeSeries.sunsetTimestamp) +
            selectedSunset.minutesFromSunset * 60_000,
        ).toISOString()
      : null
  );
  const timeZone = timeSeries?.timeZone ?? "UTC";

  return (
    <section className="atmosphericTimeline" aria-labelledby="atmospheric-timeline-title">
      <header>
        <div>
          <p className="sectionLabel">Change around sunset</p>
          <h3 id="atmospheric-timeline-title">Atmospheric timeline</h3>
        </div>
        <p>Discrete hourly ERA5 values · no interpolation between records</p>
      </header>
      {records.length === 0 ? (
        <p className="timelineEmpty">Atmospheric time series unavailable.</p>
      ) : (
        <div className="timelineScroller">
          <div className="timelinePlate">
            <div className="timelineAxisLabel">Local time</div>
            <div className="timelineAxis">
              <span className="timelineSunsetLine" style={{ left: `${sunsetPosition}%` }}>
                <b>Sunset · {timeSeries ? timeLabel(timeSeries.sunsetTimestamp, timeZone) : "Unavailable"}</b>
              </span>
              {capturePosition === null || captureRelative === 0 ? null : (
                <span className="timelineCaptureLine" style={{ left: `${capturePosition}%` }}>
                  <b>Photograph · {captureTimestamp ? timeLabel(captureTimestamp, timeZone) : "Unavailable"}</b>
                </span>
              )}
              {records.map((record) => {
                const position = atmosphericTimelinePosition(record.relativeMinutesFromSunset);
                return position === null ? null : (
                  <span className="timelineTick" key={record.timestamp} style={{ left: `${position}%` }}>
                    <strong>{timeLabel(record.timestamp, timeZone)}</strong>
                    <small>{relativeLabel(record.relativeMinutesFromSunset)}</small>
                  </span>
                );
              })}
            </div>
            {ROWS.map((row) => (
              <div className="timelineRow" key={row.field}>
                <span className="timelineRowLabel">{row.label}</span>
                <div className="timelineTrack">
                  <TimelineSlope records={records} row={row} />
                  <span className="timelineSunsetRule" style={{ left: `${sunsetPosition}%` }} />
                  {capturePosition === null || captureRelative === 0 ? null : (
                    <span className="timelineCaptureRule" style={{ left: `${capturePosition}%` }} />
                  )}
                  {records.map((record) => <TimelinePoint key={record.timestamp} record={record} row={row} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

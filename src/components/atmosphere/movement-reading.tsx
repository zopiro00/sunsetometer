import type { AtmosphericTimeRecord } from "@/domain/atmospheric-time-series";
import { compassDirection } from "@/lib/wind-direction";

function windValue(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "Unavailable"
    : `${value.toFixed(1)} km/h`;
}

export function MovementReading({ record }: { record: AtmosphericTimeRecord | null }) {
  const direction = record?.values.windDirectionDegrees ?? null;
  const compass = compassDirection(direction);

  return (
    <section className="atmosphereGroup movementReading" aria-labelledby="movement-title">
      <h3 id="movement-title">Movement</h3>
      <div className="movementLayout">
        <div className="windVane" aria-hidden="true">
          <span className="windVaneNorth">N</span>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" />
            <line x1="50" x2="50" y1="8" y2="92" />
            <line x1="8" x2="92" y1="50" y2="50" />
            {direction === null ? null : (
              <g transform={`rotate(${direction} 50 50)`}>
                <line className="windVaneDirection" x1="50" x2="50" y1="74" y2="20" />
                <path className="windVaneArrow" d="M 50 14 L 45 25 L 55 25 Z" />
              </g>
            )}
          </svg>
        </div>
        <dl className="movementMeasurements">
          <div>
            <dt>Wind direction</dt>
            <dd>{direction === null
              ? "Unavailable"
              : <><strong>{compass}</strong><span>{Math.round(direction)}°</span></>}</dd>
          </div>
          <div><dt>Wind speed</dt><dd>{windValue(record?.values.windSpeedKilometresPerHour)}</dd></div>
          <div><dt>Wind gusts</dt><dd>{windValue(record?.values.windGustsKilometresPerHour)}</dd></div>
        </dl>
      </div>
    </section>
  );
}

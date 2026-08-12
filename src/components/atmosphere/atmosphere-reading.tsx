import type { AtmosphericTimeRecord } from "@/domain/atmospheric-time-series";

function value(
  measurement: number | null | undefined,
  unit: string,
  digits = 0,
): string {
  return measurement === null || measurement === undefined
    ? "Unavailable"
    : `${measurement.toFixed(digits)} ${unit}`;
}

export function AtmosphereReading({ record }: { record: AtmosphericTimeRecord | null }) {
  const values = record?.values;
  const particlesAvailable = [
    values?.aerosolOpticalDepth,
    values?.pm2_5MicrogramsPerCubicMetre,
    values?.pm10MicrogramsPerCubicMetre,
    values?.dustMicrogramsPerCubicMetre,
  ].some((measurement) => measurement !== null && measurement !== undefined);

  return (
    <section className="atmosphereGroup atmosphereReading" aria-labelledby="atmospheric-measurements-title">
      <h3 id="atmospheric-measurements-title">Atmosphere</h3>
      <dl className="atmosphereMeasurementGrid">
        <div><dt>Relative humidity</dt><dd>{value(values?.relativeHumidityPercent, "%")}</dd></div>
        <div><dt>Dew point</dt><dd>{value(values?.dewPointCelsius, "°C", 1)}</dd></div>
        <div><dt>Visibility</dt><dd>{values?.visibilityMetres === null || values?.visibilityMetres === undefined
          ? "Unavailable"
          : `${(values.visibilityMetres / 1000).toFixed(1)} km`}</dd></div>
        <div><dt>Pressure</dt><dd>{value(values?.surfacePressureHectopascals, "hPa")}</dd></div>
        <div><dt>Temperature</dt><dd>{value(values?.temperatureCelsius, "°C", 1)}</dd></div>
        <div><dt>Precipitation</dt><dd>{value(values?.precipitationMillimetres, "mm", 1)}</dd></div>
      </dl>
      <div className="particleAvailability">
        <span>Aerosol optical depth · PM2.5 · PM10 · dust</span>
        <strong>{particlesAvailable ? "Connected" : "Not yet available"}</strong>
      </div>
    </section>
  );
}

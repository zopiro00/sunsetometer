function normaliseDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export type SolarPosition = {
  /** Clockwise from true north. */
  azimuth: number;
  /** Geometric angle above or below the horizon. */
  elevation: number;
};

/** Approximate solar position for an instant and WGS84 location. */
export function solarPosition({
  timestamp,
  latitude,
  longitude,
}: {
  timestamp: string;
  latitude: number;
  longitude: number;
}): SolarPosition | null {
  const instant = Date.parse(timestamp);

  if (![instant, latitude, longitude].every(Number.isFinite)) {
    return null;
  }

  const daysSinceJ2000 = instant / 86_400_000 + 2_440_587.5 - 2_451_545;
  const meanLongitude = normaliseDegrees(280.46 + 0.9856474 * daysSinceJ2000);
  const meanAnomaly = normaliseDegrees(357.528 + 0.9856003 * daysSinceJ2000);
  const anomalyRadians = meanAnomaly * Math.PI / 180;
  const eclipticLongitude = normaliseDegrees(
    meanLongitude +
      1.915 * Math.sin(anomalyRadians) +
      0.02 * Math.sin(2 * anomalyRadians),
  ) * Math.PI / 180;
  const obliquity = (23.439 - 0.0000004 * daysSinceJ2000) * Math.PI / 180;
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(eclipticLongitude),
  );
  const siderealHours = 18.697374558 + 24.06570982441908 * daysSinceJ2000;
  const localSiderealAngle = normaliseDegrees(
    siderealHours * 15 + longitude,
  ) * Math.PI / 180;
  const hourAngle = localSiderealAngle - rightAscension;
  const latitudeRadians = latitude * Math.PI / 180;
  const elevation = Math.asin(
    Math.sin(latitudeRadians) * Math.sin(declination) +
      Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
  ) * 180 / Math.PI;
  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitudeRadians) -
      Math.tan(declination) * Math.cos(latitudeRadians),
  ) * 180 / Math.PI + 180;

  return { azimuth: normaliseDegrees(azimuth), elevation };
}

/** Approximate solar azimuth, clockwise from true north. */
export function solarAzimuth(input: Parameters<typeof solarPosition>[0]): number | null {
  return solarPosition(input)?.azimuth ?? null;
}

export function solarElevation(input: Parameters<typeof solarPosition>[0]): number | null {
  return solarPosition(input)?.elevation ?? null;
}

export function twilightPhase(elevation: number | null): string | null {
  if (elevation === null || !Number.isFinite(elevation)) return null;
  if (elevation > 0) return "Daylight";
  if (elevation > -6) return "Civil twilight";
  if (elevation > -12) return "Nautical twilight";
  if (elevation > -18) return "Astronomical twilight";
  return "Night";
}

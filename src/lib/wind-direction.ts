const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

export function compassDirection(degrees: number | null): string | null {
  if (degrees === null || !Number.isFinite(degrees)) return null;
  const normalised = ((degrees % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalised / 22.5) % COMPASS_POINTS.length];
}

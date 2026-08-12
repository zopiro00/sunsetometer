export const TIMELINE_START_MINUTES = -180;
export const TIMELINE_END_MINUTES = 120;

export function atmosphericTimelinePosition(relativeMinutes: number): number | null {
  if (!Number.isFinite(relativeMinutes)) return null;
  if (
    relativeMinutes < TIMELINE_START_MINUTES ||
    relativeMinutes > TIMELINE_END_MINUTES
  ) return null;

  return (
    (relativeMinutes - TIMELINE_START_MINUTES) /
    (TIMELINE_END_MINUTES - TIMELINE_START_MINUTES)
  ) * 100;
}

import { describe, expect, it } from "vitest";
import { atmosphericTimelinePosition } from "@/lib/atmospheric-timeline";

describe("atmosphericTimelinePosition", () => {
  it("places sunset on the shared minus-three to plus-two-hour axis", () => {
    expect(atmosphericTimelinePosition(-180)).toBe(0);
    expect(atmosphericTimelinePosition(0)).toBe(60);
    expect(atmosphericTimelinePosition(120)).toBe(100);
  });

  it("rejects observations outside the displayed window", () => {
    expect(atmosphericTimelinePosition(-181)).toBeNull();
    expect(atmosphericTimelinePosition(121)).toBeNull();
    expect(atmosphericTimelinePosition(Number.NaN)).toBeNull();
  });
});

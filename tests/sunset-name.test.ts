import { describe, expect, it } from "vitest";

import {
  generateProvisionalSunsetName,
  preserveUserSunsetName,
} from "../src/lib/sunset-name";

describe("sunset naming", () => {
  it("generates a deterministic controlled name from classification", () => {
    const evidence = {
      primaryColourFamily: "Coral",
      secondaryColourFamily: "Violet",
      chroma: 0.17,
      hue: 28.4,
      sectorCode: "S24",
    };

    const first = generateProvisionalSunsetName(evidence);
    const second = generateProvisionalSunsetName(evidence);

    expect(first).toBe(second);
    expect(first).toMatch(/^Coral (Interval|Bloom|Passage)$/);
  });

  it("uses vocabularies appropriate to low and high chroma", () => {
    expect(
      generateProvisionalSunsetName({
        primaryColourFamily: "Ash",
        chroma: 0.03,
        hue: 65,
        sectorCode: "S55",
      }),
    ).toMatch(/^Ash (Horizon|Veil|Trace)$/);

    expect(
      generateProvisionalSunsetName({
        primaryColourFamily: "Rose",
        chroma: 0.22,
        hue: 15,
        sectorCode: "S30",
      }),
    ).toMatch(/^Rose (Afterglow|Bloom|Glow)$/);
  });

  it("never uses a technical filename as naming evidence", () => {
    const name = generateProvisionalSunsetName({
      primaryColourFamily: "Golden yellow",
      chroma: 0.13,
      hue: 84,
      sectorCode: "S06",
    });

    expect(name).toMatch(/^Golden (Drift|Glow|Horizon)$/);
    expect(name).not.toContain("IMG");
  });

  it("preserves a user-authored name during recalculation", () => {
    expect(
      preserveUserSunsetName(
        { displayName: "My Harbour Evening", nameSource: "user" },
        "Indigo Passage",
      ),
    ).toEqual({
      displayName: "My Harbour Evening",
      nameSource: "user",
    });
    expect(
      preserveUserSunsetName(
        { displayName: "Old Generated Name", nameSource: "generated" },
        "Indigo Passage",
      ),
    ).toEqual({
      displayName: "Indigo Passage",
      nameSource: "generated",
    });
  });
});

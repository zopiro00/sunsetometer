import { describe, expect, it } from "vitest";
import { compassDirection } from "@/lib/wind-direction";

describe("compassDirection", () => {
  it("converts degrees into a 16-point compass direction", () => {
    expect(compassDirection(248)).toBe("WSW");
    expect(compassDirection(0)).toBe("N");
    expect(compassDirection(359)).toBe("N");
  });

  it("normalises wrapped angles and rejects unavailable values", () => {
    expect(compassDirection(-90)).toBe("W");
    expect(compassDirection(null)).toBeNull();
    expect(compassDirection(Number.NaN)).toBeNull();
  });
});

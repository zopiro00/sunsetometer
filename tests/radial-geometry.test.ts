import { describe, expect, it } from "vitest";

import {
  createAnnularSectorPath,
  pointOnCircle,
  readableTangentialRotation,
} from "../src/lib/radial-geometry";

describe("radial geometry", () => {
  it("calculates points around a circle", () => {
    expect(pointOnCircle({ centreX: 10, centreY: 20, radius: 5, angle: 0 })).toEqual(
      { x: 15, y: 20 },
    );
    expect(
      pointOnCircle({ centreX: 10, centreY: 20, radius: 5, angle: 90 }),
    ).toEqual({ x: 10, y: 25 });
  });

  it("creates an annular sector from calculated arcs", () => {
    const path = createAnnularSectorPath({
      centreX: 0,
      centreY: 0,
      innerRadius: 50,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 6,
    });

    expect(path).toBe(
      "M 100 0 A 100 100 0 0 1 99.4522 10.4528 L 49.7261 5.2264 A 50 50 0 0 0 50 0 Z",
    );
  });

  it("rejects invalid radii and empty sectors", () => {
    expect(() =>
      createAnnularSectorPath({
        centreX: 0,
        centreY: 0,
        innerRadius: 100,
        outerRadius: 50,
        startAngle: 0,
        endAngle: 6,
      }),
    ).toThrow("outer radius larger");

    expect(() =>
      createAnnularSectorPath({
        centreX: 0,
        centreY: 0,
        innerRadius: 50,
        outerRadius: 100,
        startAngle: 0,
        endAngle: 360,
      }),
    ).toThrow("angle must be greater than zero");
  });

  it("keeps tangential labels upright on the lower half", () => {
    expect(readableTangentialRotation(-90)).toBe(0);
    expect(readableTangentialRotation(90)).toBe(360);
  });
});

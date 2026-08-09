import { describe, expect, it } from "vitest";

import {
  resolveMarkerCollisions,
  type MarkerCoordinate,
} from "../src/lib/marker-collisions";

describe("resolveMarkerCollisions", () => {
  it("leaves isolated markers at their true coordinates", () => {
    const resolved = resolveMarkerCollisions([
      { id: "a", x: 10, y: 10 },
      { id: "b", x: 100, y: 100 },
    ]);

    expect(resolved).toEqual([
      {
        id: "a",
        trueX: 10,
        trueY: 10,
        displayX: 10,
        displayY: 10,
        collisionGroupId: null,
        clusterSize: 1,
        isDisplaced: false,
      },
      {
        id: "b",
        trueX: 100,
        trueY: 100,
        displayX: 100,
        displayY: 100,
        collisionGroupId: null,
        clusterSize: 1,
        isDisplaced: false,
      },
    ]);
  });

  it("separates exact overlaps while preserving true coordinates", () => {
    const resolved = resolveMarkerCollisions([
      { id: "sunset-a", x: 250, y: 300 },
      { id: "sunset-b", x: 250, y: 300 },
    ]);

    expect(resolved.map(({ trueX, trueY }) => [trueX, trueY])).toEqual([
      [250, 300],
      [250, 300],
    ]);
    expect(new Set(resolved.map(({ displayX, displayY }) => `${displayX},${displayY}`)).size).toBe(
      2,
    );
    expect(resolved.every((marker) => marker.isDisplaced)).toBe(true);
    expect(resolved[0].collisionGroupId).toBe(resolved[1].collisionGroupId);
  });

  it("is deterministic when input order changes", () => {
    const markers: MarkerCoordinate[] = [
      { id: "charlie", x: 100, y: 100 },
      { id: "alpha", x: 104, y: 102 },
      { id: "bravo", x: 98, y: 103 },
    ];

    expect(resolveMarkerCollisions(markers)).toEqual(
      resolveMarkerCollisions([...markers].reverse()),
    );
  });

  it("does not group markers at or beyond the collision threshold", () => {
    const resolved = resolveMarkerCollisions(
      [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 18, y: 0 },
      ],
      { collisionDistance: 18 },
    );

    expect(resolved.every((marker) => marker.clusterSize === 1)).toBe(true);
  });

  it("uses additional rings for dense clusters", () => {
    const denseCluster = Array.from({ length: 8 }, (_, index) => ({
      id: `sunset-${index}`,
      x: 400,
      y: 400,
    }));
    const resolved = resolveMarkerCollisions(denseCluster, {
      markersPerRing: 4,
      firstRingRadius: 10,
      ringSpacing: 8,
    });
    const displayPositions = new Set(
      resolved.map(({ displayX, displayY }) => `${displayX},${displayY}`),
    );
    const distances = resolved.map(({ displayX, displayY }) =>
      Math.hypot(displayX - 400, displayY - 400),
    );

    expect(displayPositions.size).toBe(8);
    expect(Math.min(...distances)).toBeCloseTo(10);
    expect(Math.max(...distances)).toBeCloseTo(18);
  });

  it("rejects duplicate IDs, invalid coordinates, and invalid options", () => {
    expect(() =>
      resolveMarkerCollisions([
        { id: "same", x: 0, y: 0 },
        { id: "same", x: 1, y: 1 },
      ]),
    ).toThrow("unique");

    expect(() =>
      resolveMarkerCollisions([{ id: "a", x: Number.NaN, y: 0 }]),
    ).toThrow("finite");

    expect(() =>
      resolveMarkerCollisions([{ id: "a", x: 0, y: 0 }], {
        collisionDistance: 0,
      }),
    ).toThrow("Invalid marker collision options");
  });
});

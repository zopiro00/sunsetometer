import { describe, expect, it } from "vitest";

import { approximateCoordinate } from "@/lib/photograph-metadata";

describe("photograph metadata privacy", () => {
  it("rounds precise EXIF GPS before application storage", () => {
    expect(approximateCoordinate(51.89084666666667)).toBe(51.89);
    expect(approximateCoordinate(-1.872308333333333)).toBe(-1.87);
  });
});

import { describe, expect, it } from "vitest";

import { getProvenanceLabel } from "../src/domain/provenance";

describe("getProvenanceLabel", () => {
  it("keeps measured and interpretative claims visibly distinct", () => {
    expect(getProvenanceLabel("image")).toBe("Measured from image");
    expect(getProvenanceLabel("hypothesis")).toBe(
      "Interpretative hypothesis",
    );
    expect(getProvenanceLabel("poetic")).toBe("Poetic classification");
  });
});

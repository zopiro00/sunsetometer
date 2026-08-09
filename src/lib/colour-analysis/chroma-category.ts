export type ChromaCategory = "Low" | "Moderate" | "High" | "Very high";

/**
 * Categorises the same OKLCH chroma value currently used for radial placement.
 * Thresholds are provisional and can be refined with the analysis model.
 */
export function getChromaCategory(chroma: number): ChromaCategory {
  if (!Number.isFinite(chroma) || chroma < 0) {
    throw new Error("Sunset chroma must be a finite non-negative number");
  }

  if (chroma < 0.08) {
    return "Low";
  }

  if (chroma < 0.16) {
    return "Moderate";
  }

  if (chroma < 0.22) {
    return "High";
  }

  return "Very high";
}

export type Provenance =
  | "image"
  | "metadata"
  | "external"
  | "calculated"
  | "hypothesis"
  | "poetic";

const PROVENANCE_LABELS: Record<Provenance, string> = {
  image: "Measured from image",
  metadata: "Read from photo metadata",
  external: "Retrieved atmospheric data",
  calculated: "Calculated",
  hypothesis: "Interpretative hypothesis",
  poetic: "Poetic classification",
};

export function getProvenanceLabel(provenance: Provenance): string {
  return PROVENANCE_LABELS[provenance];
}

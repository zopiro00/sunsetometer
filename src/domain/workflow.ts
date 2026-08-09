export const WORKFLOW_STEPS = [
  "Photograph",
  "Metadata",
  "Atmosphere",
  "Colour",
  "Interpretation",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

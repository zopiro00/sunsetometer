export type SunsetNameInput = {
  primaryColourFamily: string;
  secondaryColourFamily?: string;
  chroma: number;
  hue: number;
  sectorCode: string;
};

const FAMILY_ADJECTIVES: Record<string, string> = {
  "Pale yellow": "Pale",
  "Golden yellow": "Golden",
  "Warm gold": "Golden",
  Amber: "Amber",
  Apricot: "Amber",
  Orange: "Distant",
  Vermilion: "Distant",
  "Red-orange": "Distant",
  Coral: "Coral",
  Salmon: "Coral",
  Rose: "Rose",
  Pink: "Rose",
  Magenta: "Violet",
  Mauve: "Violet",
  Violet: "Violet",
  "Blue-violet": "Violet",
  Indigo: "Indigo",
  "Twilight blue": "Indigo",
  "Pale blue": "Pale",
  "Silver-grey": "Ash",
  Ash: "Ash",
  "Desaturated rose": "Ash",
  "Pale peach": "Pale",
};

const LOW_CHROMA_NOUNS: Record<string, readonly string[]> = {
  Distant: ["Horizon", "Trace", "Veil"],
  Coral: ["Veil", "Trace", "Interval"],
  Violet: ["Veil", "Passage", "Trace"],
  Golden: ["Veil", "Drift", "Horizon"],
  Rose: ["Veil", "Trace", "Horizon"],
  Amber: ["Veil", "Horizon", "Trace"],
  Ash: ["Horizon", "Veil", "Trace"],
  Indigo: ["Passage", "Horizon", "Trace"],
  Pale: ["Veil", "Horizon", "Drift"],
};

const MODERATE_CHROMA_NOUNS: Record<string, readonly string[]> = {
  Distant: ["Ember", "Passage", "Horizon"],
  Coral: ["Interval", "Bloom", "Passage"],
  Violet: ["Passage", "Interval", "Veil"],
  Golden: ["Drift", "Glow", "Horizon"],
  Rose: ["Afterglow", "Bloom", "Interval"],
  Amber: ["Veil", "Glow", "Interval"],
  Ash: ["Horizon", "Interval", "Trace"],
  Indigo: ["Passage", "Drift", "Horizon"],
  Pale: ["Drift", "Veil", "Glow"],
};

const HIGH_CHROMA_NOUNS: Record<string, readonly string[]> = {
  Distant: ["Ember", "Afterglow", "Glow"],
  Coral: ["Bloom", "Afterglow", "Glow"],
  Violet: ["Bloom", "Passage", "Afterglow"],
  Golden: ["Glow", "Bloom", "Drift"],
  Rose: ["Afterglow", "Bloom", "Glow"],
  Amber: ["Glow", "Ember", "Afterglow"],
  Ash: ["Horizon", "Trace", "Interval"],
  Indigo: ["Passage", "Afterglow", "Drift"],
  Pale: ["Glow", "Drift", "Veil"],
};

function stableIndex(input: SunsetNameInput, length: number): number {
  const signature = `${input.sectorCode}|${input.primaryColourFamily}|${input.secondaryColourFamily ?? ""}|${input.hue.toFixed(1)}|${input.chroma.toFixed(3)}`;
  let hash = 2166136261;

  for (const character of signature) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}

/**
 * Generates a restrained provisional name from structured classification.
 * Vocabulary pairs are curated by colour family and chroma band so the same
 * evidence always yields the same name without using generative AI.
 */
export function generateProvisionalSunsetName(
  input: SunsetNameInput,
): string {
  const adjective = FAMILY_ADJECTIVES[input.primaryColourFamily] ?? "Distant";
  const vocabulary =
    input.chroma < 0.08
      ? LOW_CHROMA_NOUNS
      : input.chroma >= 0.18
        ? HIGH_CHROMA_NOUNS
        : MODERATE_CHROMA_NOUNS;
  const nouns = vocabulary[adjective] ?? vocabulary.Distant;
  const noun = nouns[stableIndex(input, nouns.length)];

  return `${adjective} ${noun}`;
}

export function preserveUserSunsetName(
  current: Pick<{
    displayName: string;
    nameSource: "generated" | "user";
  }, "displayName" | "nameSource">,
  generatedName: string,
): { displayName: string; nameSource: "generated" | "user" } {
  return current.nameSource === "user"
    ? { displayName: current.displayName, nameSource: "user" }
    : { displayName: generatedName, nameSource: "generated" };
}

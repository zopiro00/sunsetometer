export type RgbColour = {
  r: number;
  g: number;
  b: number;
};

export type OklchColour = {
  l: number;
  c: number;
  h: number;
};

export type SunsetColourSector = {
  id: string;
  index: number;
  code: `S${string}`;
  name: string;
  family: string;
  representativeHex: `#${string}`;
  representativeRgb: RgbColour;
  representativeOklch: OklchColour;
  chromaticAngle: number;
  neighbourIds: readonly [string, string];
};

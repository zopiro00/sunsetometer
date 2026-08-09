import type { OklchColour, RgbColour } from "@/domain/sunset-colour";

export type OklabColour = {
  l: number;
  a: number;
  b: number;
};

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function normalizeHex(hex: string): string {
  const trimmed = hex.trim().replace(/^#/, "");
  const expanded =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : trimmed;

  if (!/^[\da-f]{6}$/i.test(expanded)) {
    throw new Error(`Invalid HEX colour: ${hex}`);
  }

  return `#${expanded.toUpperCase()}`;
}

export function hexToRgb(hex: string): RgbColour {
  const normalized = normalizeHex(hex);

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function normalizeRgb(colour: RgbColour): RgbColour {
  const channels = [colour.r, colour.g, colour.b];

  if (channels.some((channel) => !Number.isFinite(channel))) {
    throw new Error("RGB channels must be finite numbers");
  }

  return {
    r: clampByte(colour.r),
    g: clampByte(colour.g),
    b: clampByte(colour.b),
  };
}

function linearize(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function rgbToOklab(colour: RgbColour): OklabColour {
  const { r, g, b } = normalizeRgb(colour);
  const linearRed = linearize(r);
  const linearGreen = linearize(g);
  const linearBlue = linearize(b);

  const l =
    0.4122214708 * linearRed +
    0.5363325363 * linearGreen +
    0.0514459929 * linearBlue;
  const m =
    0.2119034982 * linearRed +
    0.6806995451 * linearGreen +
    0.1073969566 * linearBlue;
  const s =
    0.0883024619 * linearRed +
    0.2817188376 * linearGreen +
    0.6299787005 * linearBlue;

  const cubeRootL = Math.cbrt(l);
  const cubeRootM = Math.cbrt(m);
  const cubeRootS = Math.cbrt(s);

  return {
    l:
      0.2104542553 * cubeRootL +
      0.793617785 * cubeRootM -
      0.0040720468 * cubeRootS,
    a:
      1.9779984951 * cubeRootL -
      2.428592205 * cubeRootM +
      0.4505937099 * cubeRootS,
    b:
      0.0259040371 * cubeRootL +
      0.7827717662 * cubeRootM -
      0.808675766 * cubeRootS,
  };
}

export function rgbToOklch(colour: RgbColour): OklchColour {
  const lab = rgbToOklab(colour);
  const hueRadians = Math.atan2(lab.b, lab.a);
  const hueDegrees = ((hueRadians * 180) / Math.PI + 360) % 360;

  return {
    l: Number(lab.l.toFixed(4)),
    c: Number(Math.hypot(lab.a, lab.b).toFixed(4)),
    h: Number(hueDegrees.toFixed(2)),
  };
}

function delinearize(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

export function oklabToRgb(colour: OklabColour): RgbColour {
  const cubeRootL =
    colour.l + 0.3963377774 * colour.a + 0.2158037573 * colour.b;
  const cubeRootM =
    colour.l - 0.1055613458 * colour.a - 0.0638541728 * colour.b;
  const cubeRootS =
    colour.l - 0.0894841775 * colour.a - 1.291485548 * colour.b;
  const l = cubeRootL ** 3;
  const m = cubeRootM ** 3;
  const s = cubeRootS ** 3;

  return normalizeRgb({
    r:
      delinearize(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      ) * 255,
    g:
      delinearize(
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      ) * 255,
    b:
      delinearize(
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
      ) * 255,
  });
}

export function oklabDistance(
  first: OklabColour,
  second: OklabColour,
): number {
  return Math.hypot(
    first.l - second.l,
    first.a - second.a,
    first.b - second.b,
  );
}

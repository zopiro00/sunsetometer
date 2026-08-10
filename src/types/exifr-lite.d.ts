declare module "exifr/dist/lite.esm.mjs" {
  type ExifrInput = ArrayBuffer | Uint8Array | Blob | File | HTMLImageElement;

  export function parse(
    data: ExifrInput,
    options?: readonly (string | number)[],
  ): Promise<Record<string, unknown> | undefined>;

  export function gps(data: ExifrInput): Promise<{
    latitude: number;
    longitude: number;
  } | undefined>;
}

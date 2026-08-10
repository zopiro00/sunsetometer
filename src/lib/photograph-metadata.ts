import { gps, parse } from "exifr/dist/lite.esm.mjs";

export type LocalPhotographMetadata = {
  capturedAt: Date | null;
  approximateCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
};

export function approximateCoordinate(value: number): number {
  return Number(value.toFixed(2));
}

export async function readLocalPhotographMetadata(
  file: File,
): Promise<LocalPhotographMetadata> {
  const [dates, position] = await Promise.all([
    parse(file, ["DateTimeOriginal", "CreateDate"]).catch(() => undefined),
    gps(file).catch(() => undefined),
  ]);
  const candidateDate = dates?.DateTimeOriginal ?? dates?.CreateDate;
  const capturedAt = candidateDate instanceof Date && !Number.isNaN(candidateDate.valueOf())
    ? candidateDate
    : null;
  const approximateCoordinates = position &&
      Number.isFinite(position.latitude) &&
      Number.isFinite(position.longitude)
    ? {
        latitude: approximateCoordinate(position.latitude),
        longitude: approximateCoordinate(position.longitude),
      }
    : null;

  return { capturedAt, approximateCoordinates };
}

import type { ApproximateMapLocation } from "@/domain/cloud-field";

const APPROXIMATE_PLACES: Readonly<Record<string, readonly [number, number]>> = {
  "La Mancha, Spain": [-3.21, 39.42],
  "Toledo, Spain": [-4.03, 39.86],
  "Aranjuez, Spain": [-3.6, 40.03],
  "Cuenca, Spain": [-2.14, 40.07],
  "Madrid, Spain": [-3.7, 40.42],
  "Segovia, Spain": [-4.12, 40.95],
  "Valencia, Spain": [-0.38, 39.47],
  "Alicante, Spain": [-0.49, 38.35],
  "Murcia, Spain": [-1.13, 37.99],
  "Granada, Spain": [-3.6, 37.18],
  "Cádiz, Spain": [-6.29, 36.53],
  "Tarifa, Spain": [-5.6, 36.01],
  "Conil, Spain": [-6.09, 36.28],
  "Málaga, Spain": [-4.42, 36.72],
  "Lisbon, Portugal": [-9.14, 38.72],
  "Porto, Portugal": [-8.61, 41.15],
  "Galicia, Spain": [-8.24, 42.76],
  "Asturias, Spain": [-5.85, 43.36],
  "León, Spain": [-5.57, 42.6],
  "Burgos, Spain": [-3.7, 42.34],
  "Soria, Spain": [-2.47, 41.76],
  "Pyrenees, Spain": [0.52, 42.62],
  "Bilbao, Spain": [-2.94, 43.26],
  "San Sebastián, Spain": [-1.98, 43.32],
};

export function approximateMapLocation(
  placeName: string,
): ApproximateMapLocation | null {
  const coordinates = APPROXIMATE_PLACES[placeName];

  if (!coordinates) {
    return null;
  }

  return {
    longitude: coordinates[0],
    latitude: coordinates[1],
    placeName,
    precision: placeName.includes("La Mancha") || placeName.includes("Galicia") || placeName.includes("Asturias") || placeName.includes("Pyrenees")
      ? "region"
      : "city",
  };
}

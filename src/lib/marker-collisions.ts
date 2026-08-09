export type MarkerCoordinate = {
  id: string;
  x: number;
  y: number;
};

export type CollisionResolvedMarker = {
  id: string;
  trueX: number;
  trueY: number;
  displayX: number;
  displayY: number;
  collisionGroupId: string | null;
  clusterSize: number;
  isDisplaced: boolean;
};

export type CollisionOptions = {
  collisionDistance: number;
  firstRingRadius: number;
  ringSpacing: number;
  markersPerRing: number;
};

export const DEFAULT_COLLISION_OPTIONS: CollisionOptions = {
  collisionDistance: 18,
  firstRingRadius: 12,
  ringSpacing: 10,
  markersPerRing: 6,
};

function normalizeCoordinate(value: number): number {
  return Number(value.toFixed(4));
}

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function validate(
  markers: readonly MarkerCoordinate[],
  options: CollisionOptions,
): void {
  const ids = new Set<string>();

  for (const marker of markers) {
    if (!marker.id || ids.has(marker.id)) {
      throw new Error("Collision markers require unique, non-empty IDs");
    }

    if (!Number.isFinite(marker.x) || !Number.isFinite(marker.y)) {
      throw new Error("Collision marker coordinates must be finite");
    }

    ids.add(marker.id);
  }

  if (
    !Number.isFinite(options.collisionDistance) ||
    options.collisionDistance <= 0 ||
    !Number.isFinite(options.firstRingRadius) ||
    options.firstRingRadius <= 0 ||
    !Number.isFinite(options.ringSpacing) ||
    options.ringSpacing <= 0 ||
    !Number.isInteger(options.markersPerRing) ||
    options.markersPerRing < 2
  ) {
    throw new Error("Invalid marker collision options");
  }
}

function findClusters(
  markers: readonly MarkerCoordinate[],
  collisionDistance: number,
): MarkerCoordinate[][] {
  const parents = markers.map((_, index) => index);

  function find(index: number): number {
    let current = index;

    while (parents[current] !== current) {
      parents[current] = parents[parents[current]];
      current = parents[current];
    }

    return current;
  }

  function union(first: number, second: number): void {
    const firstRoot = find(first);
    const secondRoot = find(second);

    if (firstRoot !== secondRoot) {
      parents[Math.max(firstRoot, secondRoot)] = Math.min(
        firstRoot,
        secondRoot,
      );
    }
  }

  for (let first = 0; first < markers.length; first += 1) {
    for (let second = first + 1; second < markers.length; second += 1) {
      if (
        Math.hypot(
          markers[first].x - markers[second].x,
          markers[first].y - markers[second].y,
        ) < collisionDistance
      ) {
        union(first, second);
      }
    }
  }

  const clusters = new Map<number, MarkerCoordinate[]>();

  markers.forEach((marker, index) => {
    const root = find(index);
    const cluster = clusters.get(root) ?? [];
    cluster.push(marker);
    clusters.set(root, cluster);
  });

  return [...clusters.values()];
}

/**
 * Separates visually colliding markers without changing their classified
 * coordinates. Input order does not affect the output.
 *
 * Collision distance and offsets use the same coordinate system as the SVG.
 * Because the complete SVG scales uniformly, their relationship to marker
 * size remains stable across responsive sizes.
 */
export function resolveMarkerCollisions(
  markers: readonly MarkerCoordinate[],
  overrides: Partial<CollisionOptions> = {},
): readonly CollisionResolvedMarker[] {
  const options = { ...DEFAULT_COLLISION_OPTIONS, ...overrides };
  validate(markers, options);

  const clusters = findClusters(markers, options.collisionDistance);
  const resolved = clusters.flatMap(
    (unsortedCluster): CollisionResolvedMarker[] => {
    const cluster = [...unsortedCluster].sort((first, second) =>
      first.id.localeCompare(second.id),
    );

    if (cluster.length === 1) {
      const marker = cluster[0];
      return [{
        id: marker.id,
        trueX: marker.x,
        trueY: marker.y,
        displayX: marker.x,
        displayY: marker.y,
        collisionGroupId: null,
        clusterSize: 1,
        isDisplaced: false,
      }];
    }

    const groupKey = cluster.map((marker) => marker.id).join("|");
    const collisionGroupId = `marker-cluster-${stableHash(groupKey).toString(36)}`;
    const centreX =
      cluster.reduce((total, marker) => total + marker.x, 0) / cluster.length;
    const centreY =
      cluster.reduce((total, marker) => total + marker.y, 0) / cluster.length;
    const startAngle = stableHash(groupKey) % 360;

    return cluster.map((marker, index) => {
      const ringIndex = Math.floor(index / options.markersPerRing);
      const ringStart = ringIndex * options.markersPerRing;
      const ringCount = Math.min(
        options.markersPerRing,
        cluster.length - ringStart,
      );
      const positionOnRing = index - ringStart;
      const angle =
        startAngle + (positionOnRing * 360) / ringCount + ringIndex * 17;
      const radians = (angle * Math.PI) / 180;
      const radius =
        options.firstRingRadius + ringIndex * options.ringSpacing;
      const displayX = normalizeCoordinate(
        centreX + Math.cos(radians) * radius,
      );
      const displayY = normalizeCoordinate(
        centreY + Math.sin(radians) * radius,
      );

      return {
        id: marker.id,
        trueX: marker.x,
        trueY: marker.y,
        displayX,
        displayY,
        collisionGroupId,
        clusterSize: cluster.length,
        isDisplaced:
          displayX !== marker.x || displayY !== marker.y,
      };
    });
    },
  );

  return resolved.sort((first, second) => first.id.localeCompare(second.id));
}

export type Point = {
  x: number;
  y: number;
};

export type AnnularSectorOptions = {
  centreX: number;
  centreY: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

function formatCoordinate(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function normalizeCoordinate(value: number): number {
  return Number(value.toFixed(4));
}

export function pointOnCircle({
  centreX,
  centreY,
  radius,
  angle,
}: {
  centreX: number;
  centreY: number;
  radius: number;
  angle: number;
}): Point {
  const radians = (angle * Math.PI) / 180;

  return {
    x: normalizeCoordinate(centreX + radius * Math.cos(radians)),
    y: normalizeCoordinate(centreY + radius * Math.sin(radians)),
  };
}

export function createAnnularSectorPath({
  centreX,
  centreY,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
}: AnnularSectorOptions): string {
  if (innerRadius < 0 || outerRadius <= innerRadius) {
    throw new Error(
      "Annular sector requires an outer radius larger than its inner radius",
    );
  }

  const angleSpan = ((endAngle - startAngle) % 360 + 360) % 360;

  if (angleSpan === 0) {
    throw new Error("Annular sector angle must be greater than zero");
  }

  const outerStart = pointOnCircle({
    centreX,
    centreY,
    radius: outerRadius,
    angle: startAngle,
  });
  const outerEnd = pointOnCircle({
    centreX,
    centreY,
    radius: outerRadius,
    angle: endAngle,
  });
  const innerEnd = pointOnCircle({
    centreX,
    centreY,
    radius: innerRadius,
    angle: endAngle,
  });
  const innerStart = pointOnCircle({
    centreX,
    centreY,
    radius: innerRadius,
    angle: startAngle,
  });
  const largeArcFlag = angleSpan > 180 ? 1 : 0;

  return [
    `M ${formatCoordinate(outerStart.x)} ${formatCoordinate(outerStart.y)}`,
    `A ${formatCoordinate(outerRadius)} ${formatCoordinate(outerRadius)} 0 ${largeArcFlag} 1 ${formatCoordinate(outerEnd.x)} ${formatCoordinate(outerEnd.y)}`,
    `L ${formatCoordinate(innerEnd.x)} ${formatCoordinate(innerEnd.y)}`,
    `A ${formatCoordinate(innerRadius)} ${formatCoordinate(innerRadius)} 0 ${largeArcFlag} 0 ${formatCoordinate(innerStart.x)} ${formatCoordinate(innerStart.y)}`,
    "Z",
  ].join(" ");
}

export function readableTangentialRotation(angle: number): number {
  const tangent = ((angle + 90) % 360 + 360) % 360;
  return tangent >= 90 && tangent <= 270 ? tangent + 180 : tangent;
}

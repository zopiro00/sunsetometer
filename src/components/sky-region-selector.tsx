"use client";

import { useRef, useState, type PointerEvent } from "react";

import type { SkyRegion } from "@/domain/analysed-sunset";

type SkyRegionSelectorProps = {
  imageUrl: string;
  isAnalysing: boolean;
  onCancel: () => void;
  onConfirm: (region: SkyRegion) => void;
};

type Point = {
  x: number;
  y: number;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function SkyRegionSelector({
  imageUrl,
  isAnalysing,
  onCancel,
  onConfirm,
}: SkyRegionSelectorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [region, setRegion] = useState<SkyRegion | null>(null);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): Point {
    const bounds = surfaceRef.current?.getBoundingClientRect();

    if (!bounds) {
      return { x: 0, y: 0 };
    }

    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  }

  function updateRegion(origin: Point, current: Point) {
    const x = Math.min(origin.x, current.x);
    const y = Math.min(origin.y, current.y);
    const width = Math.abs(current.x - origin.x);
    const height = Math.abs(current.y - origin.y);

    setRegion({ x, y, width, height });
  }

  const hasUsableRegion =
    region !== null && region.width >= 0.05 && region.height >= 0.05;

  return (
    <section
      aria-labelledby="sky-region-title"
      className="skyRegionSelector"
    >
      <div>
        <p className="sectionLabel">Analysis area required</p>
        <h2 id="sky-region-title">Define the sky</h2>
        <p>
          Drag across sky only. Exclude buildings, trees, mountains, water and
          silhouettes; this selected region will be authoritative.
        </p>
      </div>

      <div
        aria-label="Photograph sky-region selection surface"
        className="skyRegionSurface"
        onPointerDown={(event) => {
          const point = pointFromEvent(event);
          event.currentTarget.setPointerCapture(event.pointerId);
          setStart(point);
          setRegion({ x: point.x, y: point.y, width: 0, height: 0 });
        }}
        onPointerMove={(event) => {
          if (start) {
            updateRegion(start, pointFromEvent(event));
          }
        }}
        onPointerUp={(event) => {
          if (start) {
            updateRegion(start, pointFromEvent(event));
          }

          setStart(null);
        }}
        ref={surfaceRef}
        role="application"
      >
        {/* A blob URL selected by the user cannot use Next image optimisation. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Selected sunset awaiting sky-region definition" src={imageUrl} />
        {region ? (
          <span
            aria-hidden="true"
            className="skyRegionSelection"
            style={{
              height: `${region.height * 100}%`,
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.width * 100}%`,
            }}
          />
        ) : null}
      </div>

      <p aria-live="polite" className="skyRegionStatus">
        {hasUsableRegion
          ? "Sky area defined. Confirm to begin analysis."
          : "No sky area defined yet."}
      </p>
      <div className="skyRegionActions">
        <button
          disabled={isAnalysing}
          onClick={() => setRegion({ x: 0, y: 0, width: 1, height: 0.5 })}
          type="button"
        >
          Select upper half
        </button>
        <button disabled={isAnalysing} onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          disabled={!hasUsableRegion || isAnalysing}
          onClick={() => {
            if (hasUsableRegion) {
              onConfirm(region);
            }
          }}
          type="button"
        >
          {isAnalysing ? "Analysing sky…" : "Analyse selected sky"}
        </button>
      </div>
    </section>
  );
}

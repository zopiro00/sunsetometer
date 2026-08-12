import type { CSSProperties } from "react";
import type { AtmosphericTimeRecord } from "@/domain/atmospheric-time-series";

type CloudLayer = {
  id: string;
  name: string;
  altitude: string;
  value: number | null;
};

function CloudLayerReading({ layer }: { layer: CloudLayer }) {
  const amount = layer.value === null
    ? 0
    : Math.min(100, Math.max(0, layer.value));
  const style = { "--cloud-amount": `${amount}%` } as CSSProperties;

  return (
    <div className="cloudLayer" style={style}>
      <div className="cloudLayerLabel">
        <span>{layer.name}</span>
        <small>{layer.altitude}</small>
      </div>
      <div className="cloudLayerAmount" aria-hidden="true"><span /></div>
      <strong>{layer.value === null ? "Unavailable" : `${Math.round(layer.value)}%`}</strong>
    </div>
  );
}

export function CloudReading({ record }: { record: AtmosphericTimeRecord | null }) {
  const values = record?.values;
  const layers: CloudLayer[] = [
    { id: "high", name: "High clouds", altitude: "approximately >5 km", value: values?.highCloudCoverPercent ?? null },
    { id: "mid", name: "Mid clouds", altitude: "approximately 2–5 km", value: values?.midCloudCoverPercent ?? null },
    { id: "low", name: "Low clouds", altitude: "approximately 0–2 km", value: values?.lowCloudCoverPercent ?? null },
  ];

  return (
    <section className="atmosphereGroup cloudReading" aria-labelledby="clouds-title">
      <div className="cloudReadingHeading">
        <h3 id="clouds-title">Clouds</h3>
        <p>Total cloud cover <strong>{values?.cloudCoverPercent === null || values?.cloudCoverPercent === undefined
          ? "Unavailable"
          : `${Math.round(values.cloudCoverPercent)}%`}</strong></p>
      </div>
      <div className="cloudLayers">
        {layers.map((layer) => <CloudLayerReading key={layer.id} layer={layer} />)}
      </div>
      <div className="cloudHorizon"><span>Horizon</span></div>
    </section>
  );
}

import type { SkyAnalysisResult } from "@/domain/analysed-sunset";

type SkyAnalysisDebugProps = {
  analysis?: SkyAnalysisResult;
};

export function SkyAnalysisDebug({ analysis }: SkyAnalysisDebugProps) {
  const debug = analysis?.debug;

  if (!debug) {
    return null;
  }

  return (
    <details className="skyAnalysisDebug">
      <summary>Development: inspect sky analysis</summary>
      <div className="skyAnalysisDebugGrid">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Selected sky crop used for analysis" src={debug.cropDataUrl} />
          <figcaption>Authoritative sky crop</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Excluded foreground-contamination pixels highlighted in red"
            src={debug.exclusionsDataUrl}
          />
          <figcaption>
            Exclusions · {debug.excludedPixels} of {debug.totalPixels} pixels
          </figcaption>
        </figure>
      </div>
      <div className="skyClusterDebug">
        {debug.clusters.map((cluster, index) => (
          <div
            className={cluster.isPrimary ? "skyClusterPrimary" : undefined}
            key={`${cluster.colour}-${index}`}
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: cluster.colour }}
            />
            <p>
              <strong>
                {cluster.isPrimary ? "Primary cluster" : `Cluster ${index + 1}`}
              </strong>
              <small>
                {cluster.colour} ·{" "}
                {Math.round(cluster.populationShare * 100)}% · score{" "}
                {cluster.score.toFixed(3)}
              </small>
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

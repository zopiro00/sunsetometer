import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { SunsetExportOptions } from "@/lib/export/sunset-poster";

type ExportLayoutPreviewProps = {
  options: SunsetExportOptions;
  sunset: AnalysedSunset;
};

const PREVIEW_COLOURS = [
  "#FFF4BA", "#EFBA3F", "#E7642C", "#D94C4A", "#E98890",
  "#C55B9B", "#78648D", "#354E7E", "#4A6D84", "#94AFB9",
  "#D1D4D2", "#C6AAA8", "#F2DAB4",
] as const;

function ClassificationPreview({ layout }: { layout: SunsetExportOptions["layout"] }) {
  if (layout === "circular") {
    return (
      <span className="exportPreviewCircular" aria-hidden="true">
        {PREVIEW_COLOURS.map((colour) => <i key={colour} style={{ background: colour }} />)}
        <b />
      </span>
    );
  }

  return (
    <span className="exportPreviewAtlas" aria-hidden="true">
      {PREVIEW_COLOURS.map((colour) => <i key={colour} style={{ background: colour }} />)}
    </span>
  );
}

function FrontSheet({ options, sunset }: ExportLayoutPreviewProps) {
  if (options.format === "postcard") {
    return (
      <div className="exportPreviewSheetFront exportPreviewPostcardFront">
        <span className="exportPreviewMasthead">Sunsetometer</span>
        <div className="exportPreviewPostcardInstrument">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview supports local blob URLs. */}
          <img alt="" src={sunset.image} />
        </div>
        <div className="exportPreviewSheetIdentity">
          <strong>{sunset.displayName}</strong>
          <small>{sunset.classification.sectorId} — {sunset.classification.sectorName}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="exportPreviewSheetFront">
      <span className="exportPreviewMasthead">Sunsetometer</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- preview supports local blob URLs. */}
      <img alt="" src={sunset.image} />
      <div className="exportPreviewSheetIdentity">
        <strong>{sunset.displayName}</strong>
        <small>{sunset.classification.sectorId}</small>
      </div>
      <ClassificationPreview layout={options.layout} />
      {options.format === "poster" && options.density !== "minimal" ? (
        <span className="exportPreviewMetricLines" aria-hidden="true"><i /><i /><i /></span>
      ) : null}
    </div>
  );
}

function BackSheet({ sunset }: Pick<ExportLayoutPreviewProps, "sunset">) {
  return (
    <div className="exportPreviewSheetBack">
      <strong>{sunset.displayName}</strong>
      <small>{sunset.classification.sectorId} — {sunset.classification.sectorName}</small>
      <span className="exportPreviewBackDivider" aria-hidden="true" />
      <span className="exportPreviewStamp" aria-hidden="true" />
      <span className="exportPreviewWritingLines" aria-hidden="true"><i /><i /><i /><i /></span>
    </div>
  );
}

export function ExportLayoutPreview({ options, sunset }: ExportLayoutPreviewProps) {
  const orientationClass = options.orientation === "landscape" ? "Landscape" : "Portrait";
  const formatClass = options.format === "postcard" ? "Postcard" : "Poster";
  const description = `${options.layout === "circular" ? "Circular" : "Atlas"} ${options.format}, ${options.orientation}, ${options.sides === "front-back" ? "front and back" : "front only"}`;

  return (
    <figure className="exportLayoutPreview" aria-label={`Export preview: ${description}`}>
      <div className={`exportPreviewSheets exportPreviewSheets${orientationClass} exportPreviewSheets${formatClass}`}>
        <div className="exportPreviewSheet">
          <FrontSheet options={options} sunset={sunset} />
        </div>
        {options.sides === "front-back" ? (
          <div className="exportPreviewSheet exportPreviewSecondSheet">
            <BackSheet sunset={sunset} />
          </div>
        ) : null}
      </div>
      <figcaption>{description}</figcaption>
    </figure>
  );
}

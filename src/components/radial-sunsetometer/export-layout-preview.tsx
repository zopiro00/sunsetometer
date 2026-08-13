import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { SunsetExportOptions } from "@/lib/export/sunset-poster";

type ExportLayoutPreviewProps = {
  options: SunsetExportOptions;
  sunset: AnalysedSunset;
};

function InstrumentPreview({ layout, sunset }: Pick<ExportLayoutPreviewProps, "sunset"> & { layout: SunsetExportOptions["layout"] }) {
  return (
    <div className={`exportPreviewInstrument exportPreviewInstrument${layout === "circular" ? "Circular" : "Atlas"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- preview supports local blob URLs. */}
      <img alt="" src={sunset.image} />
      <span className="exportPreviewObservation" aria-hidden="true" />
      <span className="exportPreviewCalibration" aria-hidden="true">S01 · S15 · S30 · S45 · S60</span>
    </div>
  );
}

function FrontSheet({ options, sunset }: ExportLayoutPreviewProps) {
  return (
    <div className={`exportPreviewSheetFront exportPreviewFront${options.layout === "circular" ? "Circular" : "Atlas"} exportPreviewFront${options.format === "postcard" ? "Postcard" : "Poster"}`}>
      <span className="exportPreviewMasthead">Sunsetometer</span>
      <InstrumentPreview layout={options.layout} sunset={sunset} />
      <div className="exportPreviewSheetIdentity">
        <strong>{sunset.displayName}</strong>
        <small>{sunset.classification.sectorId} — {sunset.classification.sectorName}</small>
      </div>
      {options.format === "poster" && options.density !== "minimal" ? (
        <span className="exportPreviewMetricLines" aria-hidden="true"><i /><i /><i /></span>
      ) : null}
    </div>
  );
}

function BackSheet({ format, sunset }: Pick<ExportLayoutPreviewProps, "sunset"> & { format: SunsetExportOptions["format"] }) {
  return (
    <div className="exportPreviewSheetBack">
      <span className="exportPreviewMasthead">{format === "poster" ? "Archive verso" : "Postcard back"}</span>
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
  const sideDescription = options.sides === "front-back"
    ? options.format === "poster" ? "front and archive verso" : "front and postcard back"
    : "front only";
  const description = `${options.layout === "circular" ? "Circular" : "Atlas"} ${options.format}, ${options.orientation}, ${sideDescription}`;

  return (
    <figure className="exportLayoutPreview" aria-label={`Export preview: ${description}`}>
      <div className={`exportPreviewSheets exportPreviewSheets${orientationClass} exportPreviewSheets${formatClass}`}>
        <div className="exportPreviewSheet">
          <FrontSheet options={options} sunset={sunset} />
        </div>
        {options.sides === "front-back" ? (
          <div className="exportPreviewSheet exportPreviewSecondSheet">
            <BackSheet format={options.format} sunset={sunset} />
          </div>
        ) : null}
      </div>
      <figcaption>{description}</figcaption>
    </figure>
  );
}

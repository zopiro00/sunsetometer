"use client";

import { useEffect, useRef, useState } from "react";

import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { ExportLayoutPreview } from "@/components/radial-sunsetometer/export-layout-preview";
import {
  DEFAULT_SUNSET_EXPORT_OPTIONS,
  downloadSunsetPoster,
  type SunsetExportOptions,
} from "@/lib/export/sunset-poster";

type SunsetExportPanelProps = {
  onClose: () => void;
  sunset: AnalysedSunset;
};

type OptionGroupProps<K extends keyof SunsetExportOptions> = {
  label: string;
  name: K;
  onChange: (name: K, value: SunsetExportOptions[K]) => void;
  options: readonly { label: string; value: SunsetExportOptions[K] }[];
  value: SunsetExportOptions[K];
};

function OptionGroup<K extends keyof SunsetExportOptions>({
  label,
  name,
  onChange,
  options,
  value,
}: OptionGroupProps<K>) {
  return (
    <fieldset className="exportOptionGroup">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={String(option.value)}>
            <input
              checked={option.value === value}
              name={`export-${name}`}
              onChange={() => onChange(name, option.value)}
              type="radio"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const LABELS = {
  layout: { circular: "Circular Sunsetometer", atlas: "Atlas / Rectangular Sunsetometer" },
  orientation: { portrait: "Portrait", landscape: "Landscape" },
  format: { poster: "Wall poster", postcard: "Postcard" },
  sides: { front: "Front only", "front-back": "Front + back" },
  density: { minimal: "Minimal", standard: "Standard", detailed: "Detailed" },
  paperSize: { a4: "A4", a3: "A3", letter: "Letter" },
} as const;

export function SunsetExportPanel({ onClose, sunset }: SunsetExportPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<SunsetExportOptions>(DEFAULT_SUNSET_EXPORT_OPTIONS);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function changeOption<K extends keyof SunsetExportOptions>(name: K, value: SunsetExportOptions[K]) {
    setOptions((current) => ({ ...current, [name]: value }));
    setStatus("");
  }

  async function download() {
    setIsExporting(true);
    setStatus("Preparing printable PDF...");
    try {
      await downloadSunsetPoster(sunset, options);
      setStatus("PDF downloaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The PDF could not be exported.");
    } finally {
      setIsExporting(false);
    }
  }

  const summary = [
    LABELS.layout[options.layout],
    LABELS.orientation[options.orientation],
    LABELS.format[options.format],
    LABELS.sides[options.sides],
    `${LABELS.density[options.density]} detail`,
    LABELS.paperSize[options.paperSize],
  ].join(" / ");

  return (
    <div className="exportPanelBackdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-describedby="export-panel-description" aria-labelledby="export-panel-title" aria-modal="true" className="exportPanel" ref={dialogRef} role="dialog">
        <header>
          <div>
            <p className="sectionLabel">Printable observation</p>
            <h2 id="export-panel-title">Export selected sunset</h2>
            <p className="visuallyHidden" id="export-panel-description">
              Configure the selected sunset PDF. Press Escape to close without changing the selected sunset.
            </p>
          </div>
          <button ref={closeButtonRef} className="exportClose" onClick={onClose} type="button">Close</button>
        </header>

        <div className="exportPanelBody">
          <div className="exportConfiguration">
            <OptionGroup label="Layout type" name="layout" onChange={changeOption} value={options.layout} options={[
              { label: "Circular Sunsetometer", value: "circular" },
              { label: "Atlas / Rectangular", value: "atlas" },
            ]} />
            <OptionGroup label="Orientation" name="orientation" onChange={changeOption} value={options.orientation} options={[
              { label: "Portrait", value: "portrait" }, { label: "Landscape", value: "landscape" },
            ]} />
            <OptionGroup label="Format" name="format" onChange={changeOption} value={options.format} options={[
              { label: "Wall poster", value: "poster" }, { label: "Postcard", value: "postcard" },
            ]} />
            <OptionGroup label="Sides" name="sides" onChange={changeOption} value={options.sides} options={[
              { label: "Front only", value: "front" }, { label: "Front + back", value: "front-back" },
            ]} />
            <OptionGroup label="Content density" name="density" onChange={changeOption} value={options.density} options={[
              { label: "Minimal", value: "minimal" }, { label: "Standard", value: "standard" }, { label: "Detailed", value: "detailed" },
            ]} />
            <label className="exportPaperSize">
              <span>Paper size</span>
              <select value={options.paperSize} onChange={(event) => changeOption("paperSize", event.target.value as SunsetExportOptions["paperSize"])}>
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="letter">Letter</option>
              </select>
            </label>
          </div>

          <div className="exportPreviewColumn">
            <ExportLayoutPreview options={options} sunset={sunset} />
            <div className="exportSummary" aria-live="polite">
              <p className="evidenceLabel">Export summary</p>
              <p>{summary}</p>
              <p>{options.sides === "front-back" ? "2 PDF pages" : "1 PDF page"}</p>
              <p className="exportContentNote">
                {options.format === "poster"
                  ? "The poster prioritises the photograph, classification and a restrained set of key measurements."
                  : options.sides === "front-back"
                    ? "The front remains visual; structured evidence is reserved for the back."
                    : "The postcard front uses a minimal visual composition."}
              </p>
            </div>
          </div>
        </div>

        <p className="exportPrivacy">The poster is generated locally in this browser. The photograph is not uploaded.</p>
        <div className="exportActions">
          <button className="exportDownload" disabled={isExporting} onClick={() => void download()} type="button">
            {isExporting ? "Preparing PDF..." : "Download PDF"}
          </button>
          <button onClick={onClose} type="button">Cancel</button>
        </div>
        <p aria-live="polite" className="exportStatus">{status}</p>
      </section>
    </div>
  );
}

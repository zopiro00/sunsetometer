import { useState } from "react";

import type { AnalysedSunset } from "@/domain/analysed-sunset";
import { getProvenanceLabel } from "@/domain/provenance";
import { getSectorByCode } from "@/lib/colour-analysis";
import { getChromaCategory } from "@/lib/colour-analysis/chroma-category";
import { SunsetExportPanel } from "@/components/radial-sunsetometer/sunset-export-panel";

type SelectedSunsetPanelProps = {
  sunset?: AnalysedSunset;
  onRename: (sunsetId: string, displayName: string) => void;
  variant?: "default" | "atlas";
};

function formatSolarOffset(minutes: number): string {
  if (minutes === 0) {
    return "At sunset";
  }

  const direction = minutes > 0 ? "after" : "before";
  return `${minutes > 0 ? "+" : "−"}${Math.abs(minutes)} min ${direction} sunset`;
}

type EditableSunsetNameProps = {
  sunset: AnalysedSunset;
  onRename: (sunsetId: string, displayName: string) => void;
};

function EditableSunsetName({
  sunset,
  onRename,
}: EditableSunsetNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(sunset.displayName);
  const [error, setError] = useState("");

  function cancel() {
    setDraftName(sunset.displayName);
    setError("");
    setIsEditing(false);
  }

  function save() {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setError("Enter a name before saving.");
      return;
    }

    onRename(sunset.id, trimmedName);
    setDraftName(trimmedName);
    setError("");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="sunsetNameEditor">
        <label htmlFor={`sunset-name-${sunset.id}`}>Sunset name</label>
        <input
          autoFocus
          id={`sunset-name-${sunset.id}`}
          onChange={(event) => {
            setDraftName(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          value={draftName}
        />
        <div>
          <button onClick={save} type="button">
            Save
          </button>
          <button onClick={cancel} type="button">
            Cancel
          </button>
        </div>
        {error ? (
          <p aria-live="polite" className="sunsetNameError">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="editableSunsetName">
      <h3 id="selected-sunset-title">
        <button onClick={() => setIsEditing(true)} type="button">
          {sunset.displayName}
        </button>
      </h3>
      <button
        aria-label={`Rename ${sunset.displayName}`}
        className="sunsetNameEditControl"
        onClick={() => setIsEditing(true)}
        type="button"
      >
        Edit name
      </button>
      <p className="sunsetNameSource">
        {sunset.nameSource === "user" ? "Named by user" : "Provisional name"}
      </p>
    </div>
  );
}

export function SelectedSunsetPanel({
  sunset,
  onRename,
  variant = "default",
}: SelectedSunsetPanelProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const variantClass =
    variant === "atlas" ? " selectedSunsetPanelAtlas" : "";
  if (!sunset) {
    return (
      <aside
        aria-labelledby="selected-sunset-title"
        className={`selectedSunsetPanel selectedSunsetPanelEmpty${variantClass}`}
      >
        <p className="sectionLabel">Selected observation</p>
        <h3 id="selected-sunset-title">No sunset selected</h3>
        <p>Choose a dot on the colour field to inspect its classification.</p>
      </aside>
    );
  }

  const sector = getSectorByCode(sunset.classification.sectorId);

  return (
    <aside
      aria-labelledby="selected-sunset-title"
      className={`selectedSunsetPanel${variantClass}`}
    >
      <header className="selectedSunsetPoetic">
        <p className="evidenceLabel">{getProvenanceLabel("poetic")}</p>
        <EditableSunsetName
          key={sunset.id}
          onRename={onRename}
          sunset={sunset}
        />
        <button className="selectedSunsetExport" onClick={() => setIsExportOpen(true)} type="button">
          Export PDF
        </button>
      </header>

      <div className="selectedSunsetEvidence">
        <section aria-label={getProvenanceLabel("metadata")}>
          <p className="evidenceLabel">{getProvenanceLabel("metadata")}</p>
          <dl>
            <div>
              <dt>Date</dt>
              <dd>{sunset.date}</dd>
            </div>
            <div>
              <dt>Approximate location</dt>
              <dd>{sunset.location}</dd>
            </div>
          </dl>
        </section>

        <section aria-label={getProvenanceLabel("image")}>
          <p className="evidenceLabel">{getProvenanceLabel("image")}</p>
          <dl>
            <div>
              <dt>Classification</dt>
              <dd>
                {sector.code} — {sector.name}
              </dd>
            </div>
            <div>
              <dt>Primary family</dt>
              <dd>{sunset.colourFamily}</dd>
            </div>
            {sunset.secondaryColourFamily ? (
              <div>
                <dt>Secondary family</dt>
                <dd>{sunset.secondaryColourFamily}</dd>
              </div>
            ) : null}
            <div>
              <dt>Primary sky colour</dt>
              <dd className="dominantColourValue">
                <span
                  aria-hidden="true"
                  className="dominantColourSwatch"
                  style={{ backgroundColor: sunset.dominantColour }}
                />
                {sunset.dominantColour.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt>OKLCH chroma</dt>
              <dd>{getChromaCategory(sunset.chroma)}</dd>
            </div>
          </dl>
        </section>

        {sunset.minutesFromSunset !== undefined ? (
          <section aria-label={getProvenanceLabel("calculated")}>
            <p className="evidenceLabel">
              {getProvenanceLabel("calculated")}
            </p>
            <dl>
              <div>
                <dt>Solar timing</dt>
                <dd>{formatSolarOffset(sunset.minutesFromSunset)}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
      {isExportOpen ? (
        <SunsetExportPanel onClose={() => setIsExportOpen(false)} sunset={sunset} />
      ) : null}
    </aside>
  );
}

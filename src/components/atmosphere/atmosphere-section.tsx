import { CloudFieldMap } from "@/components/atmosphere/cloud-field-map";
import { approximateMapLocation } from "@/data/approximate-places";
import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { CloudFieldData } from "@/domain/cloud-field";

type AtmosphereSectionProps = {
  selectedSunset: AnalysedSunset | undefined;
  cloudData?: CloudFieldData | null;
};

export function AtmosphereSection({
  selectedSunset,
  cloudData = null,
}: AtmosphereSectionProps) {
  const location = selectedSunset
    ? approximateMapLocation(selectedSunset.location)
    : null;

  return (
    <section className="atmosphereSection" aria-labelledby="atmosphere-title">
      <header className="atmosphereHeading">
        <div>
          <p className="sectionLabel">Atmospheric context</p>
          <h2 id="atmosphere-title">Cloud map</h2>
        </div>
        <p>
          A geographical reading surface for the air around the observation,
          kept separate from colour measured directly in the photograph.
        </p>
      </header>

      <div className="atmosphereLayout">
        <CloudFieldMap cloudData={cloudData} location={location} />

        <aside className="atmosphereEvidence" aria-label="Cloud map evidence">
          <fieldset disabled>
            <legend>Future source view</legend>
            <div aria-label="Cloud source view" className="cloudModeSwitch">
              <button aria-pressed="true" type="button">Cloud field</button>
              <button aria-pressed="false" type="button">Satellite</button>
            </div>
            <small>Available when both gridded sources are implemented.</small>
          </fieldset>

          <div>
            <p className="evidenceLabel">Map evidence</p>
            <dl>
              <div>
                <dt>Photograph</dt>
                <dd>{selectedSunset?.displayName ?? "No sunset selected"}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{selectedSunset?.location ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>Cloud layer</dt>
                <dd>{cloudData ? cloudData.dataType : "Not available"}</dd>
              </div>
            </dl>
          </div>

          <p className="atmosphereCaution">
            Model and reanalysis fields describe estimated atmospheric state.
            They must never be presented as direct satellite observation.
          </p>
        </aside>
      </div>
    </section>
  );
}

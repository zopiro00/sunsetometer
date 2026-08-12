import type { AnalysedSunset } from "@/domain/analysed-sunset";
import type { AtmosphericTimeRecord } from "@/domain/atmospheric-time-series";
import type { ApproximateMapLocation } from "@/domain/cloud-field";
import { interpretSunsetAtmosphere } from "@/lib/atmospheric-interpretation";

export function AtmosphericInterpretationStrip({
  selectedSunset,
  atmosphericRecord,
  sunsetTimestamp,
  location,
}: {
  selectedSunset: AnalysedSunset | undefined;
  atmosphericRecord: AtmosphericTimeRecord | null;
  sunsetTimestamp: string | null;
  location: ApproximateMapLocation | null;
}) {
  const interpretation = interpretSunsetAtmosphere({
    sunset: selectedSunset,
    atmosphericRecord,
    sunsetTimestamp,
    location,
  });

  return (
    <section className="atmosphericInterpretation" aria-labelledby="atmospheric-interpretation-title">
      <header>
        <div>
          <p><span>Interpretation</span><span>Rule-based analysis</span></p>
          <h3 id="atmospheric-interpretation-title">Why might the sky look like this?</h3>
        </div>
        <details className="interpretationInfo">
          <summary>Evidence and interpretation</summary>
          <p>
            Image measurements, photograph metadata and ERA5 reanalysis are
            evidence. The statements below are cautious hypotheses activated
            by deterministic rules; they are not direct measurements or proof
            of atmospheric causation.
          </p>
        </details>
      </header>

      {!interpretation.evidenceAvailable ? (
        <p className="interpretationEmpty">Select a sunset to examine its structured evidence.</p>
      ) : (
        <>
          <div className="interpretationStatements">
            {interpretation.rules.map((rule) => <p key={rule.id}>{rule.text}</p>)}
          </div>
          <details className="interpretationDebug">
            <summary>Evidence that activated these rules</summary>
            <div>
              {interpretation.rules.map((rule) => (
                <section key={rule.id}>
                  <h4>{rule.id}</h4>
                  <dl>
                    {rule.evidence.map((item) => (
                      <div key={`${rule.id}-${item.key}`}>
                        <dt><span>{item.category}</span>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}

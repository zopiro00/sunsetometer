import { WORKFLOW_STEPS } from "@/domain/workflow";

export function Workflow() {
  return (
    <section className="workflow" aria-labelledby="workflow-title">
      <p className="sectionLabel">Proposed method</p>
      <h2 id="workflow-title">From photograph to interpretation</h2>
      <ol>
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

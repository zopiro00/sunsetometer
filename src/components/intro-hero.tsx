"use client";

import { useEffect, useRef, type ChangeEvent } from "react";

type IntroHeroProps = {
  isAnalysing: boolean;
  isDemoMode: boolean;
  onDemoChange: (showDemo: boolean) => void;
  onPhotograph: (file: File | undefined) => void;
  showDemo: boolean;
  status: string;
};

export function IntroHero({
  isAnalysing,
  isDemoMode,
  onDemoChange,
  onPhotograph,
  showDemo,
  status,
}: IntroHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const progress = reducedMotion.matches
        ? 0
        : Math.min(1, Math.max(0, -section.getBoundingClientRect().top / window.innerHeight));
      section.style.setProperty("--hero-scroll", progress.toFixed(4));
    };

    const requestUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onPhotograph(event.target.files?.[0]);
    event.target.value = "";
  }

  return (
    <section className="hero" aria-labelledby="page-title" ref={sectionRef}>
      <div className="heroSkyShift" aria-hidden="true" />
      <div className="heroSun" aria-hidden="true" />
      <div className="heroHorizon" aria-hidden="true" />

      <div className="eyebrow heroEyebrow" aria-hidden="true">
        <span>Field instrument No. 01</span>
        <span>{isDemoMode ? "Development mode" : "Prototype"}</span>
      </div>

      <div className="heroCopy">
        <p className="kicker">An atlas of evening light</p>
        <h1 id="page-title">Sunsetometer</h1>
        <p className="introduction">An instrument for classifying sunsets</p>
      </div>

      <div className="heroLower">
        <a className="scrollPrompt" href="#instrument-title">
          <span aria-hidden="true">↓</span>
          Scroll to begin
        </a>

        <div className="pickerShell">
          <div className="sunMark" aria-hidden="true">
            <span />
          </div>
          <h2>Choose a sunset</h2>
          <p>Analyse a photograph locally and place it on the colour field.</p>
          <label
            aria-disabled={isAnalysing}
            className="photographPicker"
            htmlFor="sunset-photograph"
          >
            {isAnalysing ? "Analysing…" : "Choose from your device"}
          </label>
          <input
            accept="image/*"
            className="visuallyHidden"
            disabled={isAnalysing}
            id="sunset-photograph"
            onChange={handleFileChange}
            type="file"
          />
          <p aria-live="polite" id="picker-status" className="status">
            {status}
          </p>
          {isDemoMode ? (
            <label className="demoControl">
              <input
                checked={showDemo}
                onChange={(event) => onDemoChange(event.target.checked)}
                type="checkbox"
              />
              Show demo observations
            </label>
          ) : null}
        </div>
      </div>
    </section>
  );
}

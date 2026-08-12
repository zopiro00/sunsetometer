"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { RadialSunsetometer } from "@/components/radial-sunsetometer/radial-sunsetometer";
import { AtmosphereSection } from "@/components/atmosphere/atmosphere-section";
import { IntroHero } from "@/components/intro-hero";
import { SkyAnalysisDebug } from "@/components/sky-analysis-debug";
import { SkyRegionSelector } from "@/components/sky-region-selector";
import { MOCK_ANALYSED_SUNSETS } from "@/data/mock-analysed-sunsets";
import type {
  AnalysedSunset,
  SkyRegion,
} from "@/domain/analysed-sunset";
import { analyseSunsetFile } from "@/lib/colour-analysis/image-analysis";

const DEMO_MODE =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_SUNSETOMETER_DEMO === "true";

export function SunsetometerExperience() {
  const [analysedSunsets, setAnalysedSunsets] = useState<
    readonly AnalysedSunset[]
  >([]);
  const [demoSunsets, setDemoSunsets] = useState<readonly AnalysedSunset[]>(
    MOCK_ANALYSED_SUNSETS,
  );
  const [selectedSunsetId, setSelectedSunsetId] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "The photograph stays in this browser and is not uploaded.",
  );
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [showDemo, setShowDemo] = useState(DEMO_MODE);
  const [pendingPhoto, setPendingPhoto] = useState<{
    file: File;
    imageUrl: string;
  } | null>(null);
  const objectUrls = useRef(new Set<string>());
  const sunsets = useMemo(
    () =>
      showDemo
        ? [...analysedSunsets, ...demoSunsets]
        : analysedSunsets,
    [analysedSunsets, demoSunsets, showDemo],
  );
  const selectedSunset = sunsets.find((sunset) => sunset.id === selectedSunsetId);

  useEffect(
    () => () => {
      for (const url of objectUrls.current) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  function handlePhotograph(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Choose an image file to analyse.");
      return;
    }

    if (pendingPhoto) {
      URL.revokeObjectURL(pendingPhoto.imageUrl);
      objectUrls.current.delete(pendingPhoto.imageUrl);
    }

    const imageUrl = URL.createObjectURL(file);
    objectUrls.current.add(imageUrl);
    setPendingPhoto({ file, imageUrl });
    setStatus("Define the sky area before analysis.");
    window.setTimeout(() => {
      document
        .getElementById("sky-region-title")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function handleSkyRegion(region: SkyRegion) {
    if (!pendingPhoto) {
      return;
    }

    setIsAnalysing(true);
    setStatus("Clustering colours within the selected sky area…");

    try {
      const result = await analyseSunsetFile(
        pendingPhoto.file,
        region,
        pendingPhoto.imageUrl,
        DEMO_MODE,
      );
      objectUrls.current.add(result.image);
      setAnalysedSunsets((current) => [result, ...current]);
      setSelectedSunsetId(result.id);
      setPendingPhoto(null);
      setStatus(
        `${result.displayName} classified as ${result.classification.sectorId} — ${result.classification.sectorName}.`,
      );
      document
        .getElementById("instrument-title")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The photograph could not be analysed.",
      );
    } finally {
      setIsAnalysing(false);
    }
  }

  function renameSunset(sunsetId: string, displayName: string) {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      return;
    }

    const rename = (sunset: AnalysedSunset) =>
      sunset.id === sunsetId
        ? {
            ...sunset,
            displayName: trimmedName,
            nameSource: "user" as const,
          }
        : sunset;

    setAnalysedSunsets((current) => current.map(rename));
    setDemoSunsets((current) => current.map(rename));
    setStatus(`Sunset renamed to ${trimmedName}.`);
  }

  return (
    <>
      <IntroHero
        isAnalysing={isAnalysing}
        isDemoMode={DEMO_MODE}
        onDemoChange={(nextShowDemo) => {
          setShowDemo(nextShowDemo);

          if (
            !nextShowDemo &&
            MOCK_ANALYSED_SUNSETS.some(
              (sunset) => sunset.id === selectedSunsetId,
            )
          ) {
            setSelectedSunsetId(null);
          }
        }}
        onPhotograph={handlePhotograph}
        showDemo={showDemo}
        status={status}
      />

      {pendingPhoto ? (
        <SkyRegionSelector
          imageUrl={pendingPhoto.imageUrl}
          isAnalysing={isAnalysing}
          onCancel={() => {
            URL.revokeObjectURL(pendingPhoto.imageUrl);
            objectUrls.current.delete(pendingPhoto.imageUrl);
            setPendingPhoto(null);
            setStatus("Sky analysis cancelled; the photograph was not analysed.");
          }}
          onConfirm={(region) => {
            void handleSkyRegion(region);
          }}
        />
      ) : null}

      <RadialSunsetometer
        onRename={renameSunset}
        onSelect={setSelectedSunsetId}
        selectedSunsetId={selectedSunsetId}
        sunsets={sunsets}
      />
      <AtmosphereSection selectedSunset={selectedSunset} />
      {DEMO_MODE ? (
        <SkyAnalysisDebug analysis={selectedSunset?.skyAnalysis} />
      ) : null}
    </>
  );
}

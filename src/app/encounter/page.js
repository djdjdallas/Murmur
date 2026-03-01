"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Camera from "@/components/Camera";
import OrganismCard from "@/components/OrganismCard";
import NarrativePlayer from "@/components/NarrativePlayer";

export default function EncounterPage() {
  const [phase, setPhase] = useState("camera"); // camera | identifying | identified | narrating
  const [capturedImage, setCapturedImage] = useState(null);
  const [organism, setOrganism] = useState(null);
  const [identifyError, setIdentifyError] = useState(null);
  const [script, setScript] = useState(null);
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [narrateLoading, setNarrateLoading] = useState(false);

  const handleCapture = useCallback(async (imageBase64) => {
    setCapturedImage(imageBase64);
    setPhase("identifying");
    setIdentifyError(null);
    setOrganism(null);
    setScript(null);
    setVoiceProfile(null);

    try {
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Identification failed");
      }

      if (!data.identified) {
        setIdentifyError(
          data.message || "Could not identify the organism. Try again with a clearer shot."
        );
        setPhase("camera");
        return;
      }

      setOrganism(data.organism);
      setPhase("identified");
    } catch (err) {
      console.error("Identification failed:", err);
      setIdentifyError(err.message || "Something went wrong. Please try again.");
      setPhase("camera");
    }
  }, []);

  const handleNarrate = useCallback(
    async (mode) => {
      if (!organism) return;

      setNarrateLoading(true);
      setScript(null);

      try {
        const response = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organism, mode }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Narration failed");
        }

        setScript(data.script);
        setVoiceProfile(data.persona);
        setPhase("narrating");
      } catch (err) {
        console.error("Narration failed:", err);
      } finally {
        setNarrateLoading(false);
      }
    },
    [organism]
  );

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setOrganism(null);
    setScript(null);
    setVoiceProfile(null);
    setIdentifyError(null);
    setPhase("camera");
    window.speechSynthesis?.cancel();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-stone-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-stone-950/80 backdrop-blur-sm border-b border-stone-800/50 z-10">
        <Link
          href="/"
          className="text-stone-400 hover:text-stone-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">🌿</span>
          <span className="text-sm font-semibold text-stone-200">
            Murmur
          </span>
        </div>
        {phase !== "camera" ? (
          <button
            onClick={handleReset}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            New
          </button>
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Camera / Image section */}
        <div className="relative aspect-[3/4] max-h-[50vh] w-full bg-stone-900">
          {phase === "camera" ? (
            <Camera onCapture={handleCapture} disabled={false} />
          ) : (
            <>
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Identifying overlay */}
              {phase === "identifying" && (
                <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-stone-300">
                      Identifying organism...
                    </span>
                  </div>
                </div>
              )}

              {/* Organism badge overlay */}
              {organism && phase !== "identifying" && (
                <div className="absolute bottom-3 left-3">
                  <OrganismCard organism={organism} compact />
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom panel */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto safe-bottom">
          {/* Error state */}
          {identifyError && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-400">{identifyError}</p>
              <button
                onClick={handleReset}
                className="mt-2 text-sm text-amber-300 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* Camera phase instructions */}
          {phase === "camera" && !identifyError && (
            <div className="text-center py-8">
              <p className="text-stone-400 text-sm">
                Point your camera at a plant, tree, bird, insect, or mushroom
              </p>
              <p className="text-stone-600 text-xs mt-2">
                Tap the green button to capture
              </p>
            </div>
          )}

          {/* Identification result */}
          {organism && (phase === "identified" || phase === "narrating") && (
            <>
              <OrganismCard organism={organism} />

              <div className="pt-2">
                <h3 className="text-sm font-medium text-stone-400 mb-3">
                  Choose a narrative mode to hear {organism.commonName} speak:
                </h3>
                <NarrativePlayer
                  organism={organism}
                  onNarrate={handleNarrate}
                  loading={narrateLoading}
                  script={script}
                  voiceProfile={voiceProfile}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

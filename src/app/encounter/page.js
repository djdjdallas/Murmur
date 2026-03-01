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

  // Trail Mode state
  const [trailMode, setTrailMode] = useState(false);
  const [trailHistory, setTrailHistory] = useState([]);

  const handleCapture = useCallback(
    async (imageBase64) => {
      setCapturedImage(imageBase64);
      setPhase("identifying");
      setIdentifyError(null);
      setScript(null);
      setVoiceProfile(null);

      // In trail mode, keep previous organism visible until new one is identified
      if (!trailMode) {
        setOrganism(null);
      }

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
            data.message ||
              "Could not identify the organism. Try again with a clearer shot."
          );
          setPhase(trailMode ? "trail-ready" : "camera");
          return;
        }

        setOrganism(data.organism);

        // In trail mode, add to history
        if (trailMode) {
          setTrailHistory((prev) => [
            {
              organism: data.organism,
              image: imageBase64,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
        }

        // NarrativePlayer auto-starts narration via Gemini Live
        setPhase("narrating");
      } catch (err) {
        console.error("Identification failed:", err);
        setIdentifyError(
          err.message || "Something went wrong. Please try again."
        );
        setPhase(trailMode ? "trail-ready" : "camera");
      }
    },
    [trailMode]
  );

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
        setIdentifyError(err.message || "Narration failed. Please try again.");
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
    setTrailMode(false);
    setTrailHistory([]);
    window.speechSynthesis?.cancel();
  }, []);

  const handleNewCapture = useCallback(() => {
    setCapturedImage(null);
    setScript(null);
    setVoiceProfile(null);
    setIdentifyError(null);
    setPhase(trailMode ? "trail-ready" : "camera");
  }, [trailMode]);

  const toggleTrailMode = useCallback(() => {
    setTrailMode((prev) => !prev);
    if (!trailMode) {
      setPhase("trail-ready");
    }
  }, [trailMode]);

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
          <span className="text-sm font-semibold text-stone-200">Murmur</span>
          {trailMode && (
            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
              TRAIL
            </span>
          )}
        </div>
        {phase !== "camera" && phase !== "trail-ready" ? (
          <button
            onClick={trailMode ? handleNewCapture : handleReset}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            {trailMode ? "Next" : "New"}
          </button>
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Camera / Image section */}
        <div className="relative aspect-[3/4] max-h-[50vh] w-full bg-stone-900">
          {phase === "camera" || phase === "trail-ready" ? (
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

          {/* Trail Mode toggle */}
          {(phase === "camera" || phase === "trail-ready") && (
            <div className="absolute top-3 right-3">
              <button
                onClick={toggleTrailMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm transition-all ${
                  trailMode
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                    : "bg-stone-800/70 border border-stone-700/50 text-stone-400 hover:text-stone-200"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Trail Mode
              </button>
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto safe-bottom">
          {/* Error state */}
          {identifyError && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-400">{identifyError}</p>
              <button
                onClick={trailMode ? handleNewCapture : handleReset}
                className="mt-2 text-sm text-amber-300 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* Trail Mode ready state */}
          {phase === "trail-ready" && !identifyError && (
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-sm text-amber-300 font-medium">
                  Trail Mode Active
                </span>
              </div>
              <p className="text-stone-400 text-sm">
                Keep walking — capture organisms as you go.
              </p>
              <p className="text-stone-600 text-xs">
                Audio narration streams live via Gemini. No waiting.
              </p>
            </div>
          )}

          {/* Identification result */}
          {organism && (phase === "identified" || phase === "narrating") && (
            <>
              <OrganismCard organism={organism} />

              <div className="pt-2">
                <h3 className="text-sm font-medium text-stone-400 mb-3">
                  Hear {organism.commonName} speak:
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

          {/* Trail history */}
          {trailMode && trailHistory.length > 1 && (
            <div className="pt-4 space-y-3">
              <h4 className="text-xs font-medium text-stone-600 uppercase tracking-wider">
                Trail Log
              </h4>
              <div className="space-y-2">
                {trailHistory.slice(1).map((entry, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setOrganism(entry.organism);
                      setCapturedImage(entry.image);
                      setScript(null);
                      setPhase("identified");
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg bg-stone-800/30 border border-stone-700/20 hover:bg-stone-800/50 transition-colors text-left"
                  >
                    <img
                      src={entry.image}
                      alt={entry.organism.commonName}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-300 truncate">
                        {entry.organism.commonName}
                      </p>
                      <p className="text-xs text-stone-600">
                        {entry.timestamp}
                      </p>
                    </div>
                    <OrganismCard organism={entry.organism} compact />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

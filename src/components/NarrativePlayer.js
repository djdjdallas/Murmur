"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const modeLabels = {
  trail: { label: "Trail Guide", icon: "🥾", description: "Friendly hiking companion" },
  folklore: { label: "Folklore", icon: "📜", description: "Myths and legends" },
  survival: { label: "Survival", icon: "🛡️", description: "Adaptation and resilience" },
  ranger: { label: "Ranger", icon: "🔬", description: "Scientific field guide" },
};

export default function NarrativePlayer({
  organism,
  onNarrate,
  loading = false,
  script = null,
  voiceProfile = null,
}) {
  const [activeMode, setActiveMode] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleModeSelect = useCallback(
    async (mode) => {
      // Stop any current speech
      window.speechSynthesis?.cancel();
      setSpeaking(false);

      setActiveMode(mode);
      onNarrate?.(mode);
    },
    [onNarrate]
  );

  const speak = useCallback(
    (text) => {
      if (!("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = voiceProfile?.voicePitch || 1;
      utterance.rate = voiceProfile?.voiceRate || 1;
      utterance.volume = 1;

      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.localService
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [voiceProfile]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Mode selection buttons */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(modeLabels).map(([mode, { label, icon, description }]) => (
          <button
            key={mode}
            onClick={() => handleModeSelect(mode)}
            disabled={loading}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-left ${
              activeMode === mode
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "bg-stone-800/50 border-stone-700/30 text-stone-300 hover:bg-stone-800 hover:border-stone-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-stone-500">{description}</span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 p-4 bg-stone-800/50 rounded-xl border border-stone-700/30">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-stone-400">
            Composing narration...
          </span>
        </div>
      )}

      {/* Script display */}
      {script && !loading && (
        <div className="space-y-3">
          <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700/30 max-h-48 overflow-y-auto">
            <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">
              {script}
            </p>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3">
            {speaking ? (
              <button
                onClick={stopSpeaking}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span className="text-sm font-medium">Stop</span>
              </button>
            ) : (
              <button
                onClick={() => speak(script)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="text-sm font-medium">Listen</span>
              </button>
            )}
          </div>

          {voiceProfile && (
            <p className="text-xs text-stone-600 text-center">
              Voice: {voiceProfile.name} — {voiceProfile.temperament}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

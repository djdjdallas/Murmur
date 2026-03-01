"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { getNarrativePrompt } from "@/lib/personas";
import StoryPanels from "./StoryPanels";

const modeLabels = {
  trail: {
    label: "Trail Guide",
    icon: "🥾",
    description: "Friendly hiking companion",
  },
  folklore: {
    label: "Folklore",
    icon: "📜",
    description: "Myths and legends",
  },
  survival: {
    label: "Survival",
    icon: "🛡️",
    description: "Adaptation and resilience",
  },
  ranger: {
    label: "Ranger",
    icon: "🔬",
    description: "Scientific field guide",
  },
};

export default function NarrativePlayer({
  organism,
  onNarrate,
  loading = false,
  script = null,
  voiceProfile = null,
}) {
  const [activeMode, setActiveMode] = useState("trail");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [useLiveApi, setUseLiveApi] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const utteranceRef = useRef(null);

  const {
    connect,
    sendMessage,
    startListening,
    stopListening,
    disconnect,
    stopAudio,
    isConnected,
    isPlaying,
    isListening,
    error: liveConnectionError,
    transcript,
  } = useGeminiLive();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start narration via Gemini Live when organism is available
  useEffect(() => {
    if (organism && useLiveApi && !hasAutoStarted) {
      setHasAutoStarted(true);
      handleLiveNarrate("trail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organism, useLiveApi, hasAutoStarted]);

  /**
   * Start a Live API narration session.
   */
  const handleLiveNarrate = useCallback(
    async (mode) => {
      if (!organism) return;

      setLiveLoading(true);
      setLiveError(null);

      try {
        const tokenRes = await fetch("/api/live-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organism, mode }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error);

        const { persona, tone, prompt: modePrompt } = getNarrativePrompt(
          organism.category,
          mode
        );

        const systemPrompt = `You are a ${organism.commonName} (${organism.scientificName}).
Category: ${organism.category}
Habitat: ${organism.habitat}
Estimated age: ${organism.estimatedAge}
Interesting fact: ${organism.interestingFact}

Your character name is "${persona.name}" and your temperament is ${persona.temperament}.
${modePrompt}

Speak in first person as this organism. Be vivid, personal, and memorable.
Begin speaking directly — no introduction like "I am a..." — just launch into your story naturally.
Keep the narration between 150-250 words.
End with a line that makes the listener want to look more closely at you.

IMPORTANT: You are having a live conversation. After your initial narration, the human may ask you follow-up questions. Stay in character and answer naturally as this organism would. Keep follow-up answers concise (2-4 sentences).`;

        if (!isConnected) {
          await connect(systemPrompt, {
            apiKey: tokenData.apiKey,
            model: tokenData.model,
            voiceName: tokenData.voiceName,
          });
        }

        const userMessage = `Tell me your story in the style of a ${tone}. You are a ${organism.commonName} found in ${organism.habitat}.`;
        sendMessage(userMessage);

        setLiveLoading(false);
      } catch (err) {
        console.error("Live narration error:", err);
        setLiveError(err.message || "Failed to start live narration");
        setLiveLoading(false);

        // Fall back to regular narration
        setUseLiveApi(false);
        onNarrate?.(mode);
      }
    },
    [organism, isConnected, connect, sendMessage, onNarrate]
  );

  const handleModeSelect = useCallback(
    async (mode) => {
      stopAudio();
      stopListening();
      window.speechSynthesis?.cancel();
      setSpeaking(false);

      setActiveMode(mode);

      if (useLiveApi) {
        // Disconnect and reconnect with new persona
        disconnect();
        setHasAutoStarted(false);
        setTimeout(() => handleLiveNarrate(mode), 100);
      } else {
        onNarrate?.(mode);
      }
    },
    [useLiveApi, handleLiveNarrate, onNarrate, stopAudio, stopListening, disconnect]
  );

  /**
   * Toggle microphone for interactive conversation
   */
  const handleTalkToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Fallback: Web Speech API
  const speak = useCallback(
    (text) => {
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = voiceProfile?.voicePitch || 1;
      utterance.rate = voiceProfile?.voiceRate || 0.95;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      // Prefer high-quality voices on iOS/macOS
      const preferredVoice =
        voices.find((v) => v.name === "Samantha" && v.lang.startsWith("en")) ||
        voices.find((v) => v.name === "Daniel" && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en") && v.localService) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;

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
    stopAudio();
    stopListening();
  }, [stopAudio, stopListening]);

  const isAudioActive = isPlaying || speaking;
  const isLoading = loading || liveLoading;

  return (
    <div className="space-y-4">
      {/* Audio mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-600">Audio engine:</span>
        <button
          onClick={() => {
            disconnect();
            setHasAutoStarted(false);
            setUseLiveApi(!useLiveApi);
          }}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            useLiveApi
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-stone-800/50 border-stone-700/30 text-stone-400"
          }`}
        >
          {useLiveApi ? "Gemini Live" : "Web Speech"}
        </button>
      </div>

      {/* Live API connection indicator */}
      {useLiveApi && isConnected && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400">
            Live session active — ask questions!
          </span>
          <button
            onClick={disconnect}
            className="ml-auto text-xs text-stone-500 hover:text-stone-300"
          >
            End
          </button>
        </div>
      )}

      {/* Mode selection buttons */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(modeLabels).map(
          ([mode, { label, icon, description }]) => (
            <button
              key={mode}
              onClick={() => handleModeSelect(mode)}
              disabled={isLoading}
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
          )
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 p-4 bg-stone-800/50 rounded-xl border border-stone-700/30">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-stone-400">
            {useLiveApi
              ? "Connecting to Gemini Live..."
              : "Composing narration..."}
          </span>
        </div>
      )}

      {/* Live API error */}
      {(liveError || liveConnectionError) && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-400">
            {liveError || liveConnectionError}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Switched to Web Speech API fallback
          </p>
        </div>
      )}

      {/* Live audio playback + conversation controls */}
      {useLiveApi && (isPlaying || isConnected) && !isLoading && (
        <div className="space-y-3">
          {/* Playing indicator */}
          {isPlaying && (
            <div className="flex items-center gap-3 p-4 bg-stone-800/50 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: `${0.4 + Math.random() * 0.3}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-emerald-400 flex-1">
                {organism?.commonName} is speaking...
              </span>
              <button
                onClick={stopSpeaking}
                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Stop
              </button>
            </div>
          )}

          {/* Interactive talk button */}
          {isConnected && !isPlaying && (
            <button
              onClick={handleTalkToggle}
              className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                isListening
                  ? "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {isListening ? (
                <>
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    Listening... Tap to stop
                  </span>
                </>
              ) : (
                <>
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
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  <span className="text-sm font-medium">
                    Ask {organism?.commonName} a question
                  </span>
                </>
              )}
            </button>
          )}

          {/* Live transcript */}
          {transcript && (
            <div className="p-3 bg-stone-800/30 rounded-xl border border-stone-700/20 max-h-32 overflow-y-auto">
              <p className="text-xs text-stone-500 leading-relaxed">
                {transcript}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fallback: Script display (non-live mode) */}
      {!useLiveApi && script && !loading && (
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

      {/* Story panels — shown for both Live and fallback modes */}
      {(script || (useLiveApi && transcript.length > 50)) && organism && (
        <StoryPanels organism={organism} script={script || transcript} />
      )}
    </div>
  );
}

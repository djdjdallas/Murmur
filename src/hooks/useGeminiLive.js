"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/**
 * React hook for managing an interactive Gemini Live API session.
 *
 * Supports bidirectional audio:
 *  - AI → User: streams audio responses via Web Audio API
 *  - User → AI: captures microphone input and sends PCM chunks
 *
 * Push-to-talk: call startListening() to begin mic capture,
 * stopListening() to stop. The model responds after each turn.
 */
export function useGeminiLive() {
  const wsRef = useRef(null);

  // Playback refs
  const playbackCtxRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  // Mic refs
  const micStreamRef = useRef(null);
  const micCtxRef = useRef(null);
  const micProcessorRef = useRef(null);
  const micSourceRef = useRef(null);
  const micGainRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState("");

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupMic();
      cleanupPlayback();
      if (wsRef.current) {
        wsRef.current.close(1000, "Unmount");
        wsRef.current = null;
      }
    };
  }, []);

  // --- Playback ---

  function getPlaybackContext() {
    if (!playbackCtxRef.current || playbackCtxRef.current.state === "closed") {
      playbackCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)({ sampleRate: 24000 });
    }
    if (playbackCtxRef.current.state === "suspended") {
      playbackCtxRef.current.resume();
    }
    return playbackCtxRef.current;
  }

  const drainAudioQueue = useCallback(() => {
    const ctx = playbackCtxRef.current;
    if (!ctx || ctx.state === "closed") return;

    while (audioQueueRef.current.length > 0) {
      const pcmData = audioQueueRef.current.shift();
      const float32 = new Float32Array(pcmData.length / 2);
      const view = new DataView(
        pcmData.buffer,
        pcmData.byteOffset,
        pcmData.byteLength
      );
      for (let i = 0; i < float32.length; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      source.onended = () => {
        if (
          audioQueueRef.current.length === 0 &&
          ctx.currentTime >= nextPlayTimeRef.current - 0.05
        ) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      };
    }
  }, []);

  const handleAudioChunk = useCallback(
    (base64Data) => {
      getPlaybackContext();

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        nextPlayTimeRef.current = 0;
      }

      audioQueueRef.current.push(bytes);
      drainAudioQueue();
    },
    [drainAudioQueue]
  );

  function cleanupPlayback() {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    setIsPlaying(false);
    if (
      playbackCtxRef.current &&
      playbackCtxRef.current.state !== "closed"
    ) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
  }

  // --- Microphone ---

  function cleanupMic() {
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micGainRef.current) {
      micGainRef.current.disconnect();
      micGainRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micCtxRef.current && micCtxRef.current.state !== "closed") {
      micCtxRef.current.close().catch(() => {});
      micCtxRef.current = null;
    }
    setIsListening(false);
  }

  /**
   * Start capturing microphone audio and streaming to the Live API.
   * Stops any current AI audio playback to avoid echo.
   */
  const startListening = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Not connected to Live API");
      return;
    }

    // Stop current playback to avoid echo
    stopAudio();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      micCtxRef.current = ctx;

      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      // ScriptProcessor needs to be connected to output to fire events,
      // but we silence it to prevent mic→speaker feedback
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      micGainRef.current = silentGain;

      const sampleRate = ctx.sampleRate;

      processor.onaudioprocess = (e) => {
        const currentWs = wsRef.current;
        if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const bytes = new Uint8Array(int16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        currentWs.send(
          JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: `audio/pcm;rate=${sampleRate}`,
                  data: base64,
                },
              ],
            },
          })
        );
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      setIsListening(true);
      setTranscript("");
    } catch (err) {
      console.error("Microphone error:", err);
      setError(
        err.name === "NotAllowedError"
          ? "Microphone access denied"
          : "Could not access microphone"
      );
    }
  }, []);

  /**
   * Stop microphone capture. The model will process and respond.
   */
  const stopListening = useCallback(() => {
    cleanupMic();
  }, []);

  // --- WebSocket ---

  const connect = useCallback(
    async (systemPrompt, { apiKey, model, voiceName } = {}) => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Reconnect");
        wsRef.current = null;
      }

      setError(null);
      setTranscript("");
      setIsConnected(false);

      const modelId = model || "gemini-2.5-flash-native-audio-preview-12-2025";
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              setup: {
                model: `models/${modelId}`,
                generationConfig: {
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName: voiceName || "Kore",
                      },
                    },
                  },
                },
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
              },
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.setupComplete) {
              setIsConnected(true);
              resolve();
              return;
            }

            if (msg.serverContent) {
              const parts = msg.serverContent.modelTurn?.parts || [];

              for (const part of parts) {
                if (part.inlineData?.data) {
                  handleAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  setTranscript((prev) => prev + part.text);
                }
              }

              if (msg.serverContent.outputTranscription?.text) {
                setTranscript(
                  (prev) =>
                    prev + msg.serverContent.outputTranscription.text
                );
              }
            }
          } catch (e) {
            console.error("Failed to parse Live message:", e);
          }
        };

        ws.onerror = () => {
          console.error("Live WebSocket error");
          setError("Connection error");
          setIsConnected(false);
          reject(new Error("WebSocket connection failed"));
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          wsRef.current = null;
          if (event.code !== 1000) {
            setError(`Connection closed (code ${event.code})`);
          }
        };
      });
    },
    [handleAudioChunk]
  );

  const sendMessage = useCallback((text) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("Live session not connected");
      return;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    setTranscript("");
    nextPlayTimeRef.current = 0;

    ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true,
        },
      })
    );
  }, []);

  const disconnect = useCallback(() => {
    cleanupMic();
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    cleanupPlayback();
  }, []);

  const stopAudio = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    setIsPlaying(false);
    if (
      playbackCtxRef.current &&
      playbackCtxRef.current.state !== "closed"
    ) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
  }, []);

  return {
    connect,
    sendMessage,
    startListening,
    stopListening,
    disconnect,
    stopAudio,
    isConnected,
    isPlaying,
    isListening,
    error,
    transcript,
  };
}

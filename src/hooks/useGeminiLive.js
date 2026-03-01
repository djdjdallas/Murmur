"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/**
 * React hook for managing a Gemini Live API WebSocket session.
 *
 * Connects from the browser to the Gemini Live API, sends text prompts,
 * and plays back streamed audio using the Web Audio API.
 *
 * Supports Trail Mode: the session stays open so new prompts can be sent
 * without re-establishing the connection.
 */
export function useGeminiLive() {
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState("");

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Drain the audio queue: schedule PCM chunks as AudioBufferSourceNodes
   * so they play back-to-back without gaps.
   */
  const drainAudioQueue = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === "closed") return;

    while (audioQueueRef.current.length > 0) {
      const pcmData = audioQueueRef.current.shift();

      // Gemini Live returns 16-bit PCM at 24 kHz mono
      const sampleRate = 24000;
      const float32 = new Float32Array(pcmData.length / 2);
      const view = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
      for (let i = 0; i < float32.length; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      source.onended = () => {
        // If this was the last queued chunk, mark playback done
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

  /**
   * Process an incoming audio chunk (base64-encoded PCM).
   */
  const handleAudioChunk = useCallback(
    (base64Data) => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)({ sampleRate: 24000 });
      }

      // Resume context if suspended (mobile browsers require user gesture)
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }

      // Decode base64 → Uint8Array
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

  /**
   * Open a WebSocket to the Gemini Live API.
   *
   * @param {string} systemPrompt - The character persona / system instruction
   * @param {object} options - { apiKey, model, voiceName }
   */
  const connect = useCallback(
    async (systemPrompt, { apiKey, model, voiceName } = {}) => {
      if (wsRef.current) {
        disconnect();
      }

      setError(null);
      setTranscript("");

      const modelId = model || "gemini-2.0-flash-live-001";
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Send setup message
          const setupMessage = {
            setup: {
              model: `models/${modelId}`,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voiceName || "Orus",
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
            },
          };

          ws.send(JSON.stringify(setupMessage));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            // Setup complete
            if (msg.setupComplete) {
              setIsConnected(true);
              resolve();
              return;
            }

            // Server content (audio or text)
            if (msg.serverContent) {
              const parts =
                msg.serverContent.modelTurn?.parts || [];

              for (const part of parts) {
                if (part.inlineData?.data) {
                  handleAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  setTranscript((prev) => prev + part.text);
                }
              }

              // Output transcription (if enabled)
              if (msg.serverContent.outputTranscription?.text) {
                setTranscript(
                  (prev) =>
                    prev + msg.serverContent.outputTranscription.text
                );
              }

              // Turn complete
              if (msg.serverContent.turnComplete) {
                // Audio will finish playing from the queue
              }
            }
          } catch (e) {
            console.error("Failed to parse Live message:", e);
          }
        };

        ws.onerror = (event) => {
          console.error("Live WebSocket error:", event);
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

  /**
   * Send a text message to the live session.
   * The model will respond with streaming audio.
   */
  const sendMessage = useCallback((text) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("Live session not connected");
      return;
    }

    // Reset audio state for new response
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    setTranscript("");
    nextPlayTimeRef.current = 0;

    const message = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    ws.send(JSON.stringify(message));
  }, []);

  /**
   * Close the WebSocket and clean up audio resources.
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsPlaying(false);
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  /**
   * Stop current audio playback without disconnecting.
   */
  const stopAudio = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    setIsPlaying(false);

    // Close and recreate audio context to stop all scheduled sources
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  return {
    connect,
    sendMessage,
    disconnect,
    stopAudio,
    isConnected,
    isPlaying,
    error,
    transcript,
  };
}

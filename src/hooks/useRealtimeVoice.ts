"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseRealtimeVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (text: string) => void;
  onError?: (error: string) => void;
  voice?: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
  model?: string;
}

interface UseRealtimeVoiceReturn {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  userTranscript: string;
  aiTranscript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions = {}): UseRealtimeVoiceReturn {
  const { onTranscript, onAIResponse, onError, voice = "ash", model } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const shouldStopPlaybackRef = useRef(false);

  const stopAudioPlayback = useCallback(() => {
    shouldStopPlaybackRef.current = true;
    playbackQueueRef.current = [];
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); currentSourceRef.current.disconnect(); } catch {}
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  const int16ToBase64 = (int16Array: Int16Array): string => {
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);
    return btoa(binary);
  };

  const base64ToInt16 = (base64: string): Int16Array => {
    const binary = atob(base64);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) uint8Array[i] = binary.charCodeAt(i);
    return new Int16Array(uint8Array.buffer);
  };

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    shouldStopPlaybackRef.current = false;
    setIsSpeaking(true);

    try {
      const audioContext = audioContextRef.current || new AudioContext({ sampleRate: 24000 });
      if (!audioContextRef.current) audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') await audioContext.resume();

      while (playbackQueueRef.current.length > 0 && !shouldStopPlaybackRef.current) {
        const audioData = playbackQueueRef.current.shift()!;
        if (shouldStopPlaybackRef.current) break;

        const float32Array = new Float32Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) float32Array[i] = audioData[i] / 32768;

        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        currentSourceRef.current = source;

        await new Promise<void>((resolve) => {
          source.onended = () => { currentSourceRef.current = null; resolve(); };
          source.start();
        });
      }
    } catch (err) {
      console.error("[Jarvis] Audio playback error:", err);
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "input_audio_buffer.speech_started":
          stopAudioPlayback();
          break;

        case "conversation.item.input_audio_transcription.completed":
          setUserTranscript(data.transcript || "");
          onTranscript?.(data.transcript || "", true);
          break;

        case "response.audio_transcript.delta":
        case "response.output_audio_transcript.delta":
          setAiTranscript(prev => prev + (data.delta || ""));
          break;

        case "response.audio_transcript.done":
        case "response.output_audio_transcript.done":
          setAiTranscript(data.transcript || "");
          onAIResponse?.(data.transcript || "");
          break;

        case "response.audio.delta":
        case "response.output_audio.delta":
          if (data.delta) {
            try {
              playbackQueueRef.current.push(base64ToInt16(data.delta));
              playAudioQueue();
            } catch {}
          }
          break;

        case "response.function_call_arguments.done": {
          const fnName = data.name || "";
          const fnCallId = data.call_id || "";
          let fnArgs = {};
          try { fnArgs = JSON.parse(data.arguments || "{}"); } catch {}

          fetch(`/api/tools/${fnName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fnArgs),
          })
          .then(res => res.json())
          .then(toolResult => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: fnCallId, output: JSON.stringify(toolResult) },
              }));
              wsRef.current.send(JSON.stringify({ type: "response.create" }));
            }
          })
          .catch(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: fnCallId, output: JSON.stringify({ error: "Tool execution failed" }) },
              }));
              wsRef.current.send(JSON.stringify({ type: "response.create" }));
            }
          });
          break;
        }

        case "response.done":
          setAiTranscript("");
          if (data.response?.usage) {
            fetch("/api/usage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: model || "gpt-4o-mini-realtime-preview-2024-12-17", usage: data.response.usage }),
            }).catch(() => {});
          }
          break;

        case "error":
          const errorMsg = data.error?.message || "Unknown error";
          setError(errorMsg);
          onError?.(errorMsg);
          break;
      }
    } catch {}
  }, [onTranscript, onAIResponse, onError, playAudioQueue, stopAudioPlayback, model]);

  const connect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      setError(null);
      fetch("/api/ai/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice, model }),
      })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to get token");
        return res.json();
      })
      .then((tokenData) => {
        const token = tokenData.token;
        const rtModel = tokenData.model || "gpt-4o-mini-realtime-preview-2024-12-17";
        const serverTools = tokenData.tools || [];
        const serverInstructions = tokenData.instructions || "";

        const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${rtModel}`, [
          "realtime", `openai-insecure-api-key.${token}`
        ]);

        ws.onopen = () => {
          // Minimal session.update — voice/audio/VAD set via client_secrets
          ws.send(JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              instructions: serverInstructions,
              tools: serverTools,
            },
          }));
          setIsConnected(true);
          wsRef.current = ws;
          resolve();
        };

        ws.onmessage = handleMessage;
        ws.onerror = () => { setError("Connection error"); reject(new Error("Connection error")); };
        ws.onclose = (event) => {
          setIsConnected(false);
          setIsListening(false);
          if (event.code !== 1000 && event.code !== 1005) setError(`Connection closed: ${event.reason || 'Unknown'}`);
        };
        wsRef.current = ws;
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to connect";
        setError(message);
        reject(err);
      });
    });
  }, [voice, model, handleMessage]);

  const disconnect = useCallback(() => {
    stopAudioPlayback();
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, [stopAudioPlayback]);

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { setError("Not connected"); return; }
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setError("Voice requires HTTPS or localhost."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: int16ToBase64(floatTo16BitPCM(e.inputBuffer.getChannelData(0)))
          }));
        }
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsListening(true);
      setUserTranscript("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start listening";
      setError(message);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => { disconnect(); if (audioContextRef.current) audioContextRef.current.close(); };
  }, [disconnect]);

  return { isConnected, isListening, isSpeaking, userTranscript, aiTranscript, connect, disconnect, startListening, stopListening, error };
}

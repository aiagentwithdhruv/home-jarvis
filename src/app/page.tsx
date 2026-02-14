"use client";

import { useState, useEffect, useRef } from "react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { Mic, MicOff, Power, Zap, Brain, ListTodo, Settings } from "lucide-react";
import { SettingsModal } from "@/components/settings-modal";

interface Message {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: Date;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function JarvisHome() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [usage, setUsage] = useState({ totalCost: 0, todayCost: 0, totalConversations: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    isListening,
    isSpeaking,
    userTranscript,
    aiTranscript,
    connect,
    disconnect,
    startListening,
    stopListening,
    error,
  } = useRealtimeVoice({
    voice: "ash",
    model: "gpt-4o-mini-realtime-preview-2024-12-17",
    onTranscript: (text) => {
      if (text.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: `user_${Date.now()}`, role: "user", text: text.trim(), timestamp: new Date() },
        ]);
      }
    },
    onAIResponse: (text) => {
      if (text.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: `jarvis_${Date.now()}`, role: "jarvis", text: text.trim(), timestamp: new Date() },
        ]);
      }
    },
    onError: (err) => console.error("[Jarvis] Error:", err),
  });

  // Fetch usage on mount
  useEffect(() => {
    fetch("/api/usage").then(r => r.json()).then(setUsage).catch(() => {});
  }, [messages.length]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTranscript]);

  const handleToggle = async () => {
    if (isActive) {
      stopListening();
      disconnect();
      setIsActive(false);
    } else {
      try {
        await connect();
        await startListening();
        setIsActive(true);
      } catch (err) {
        console.error("Failed to start:", err);
      }
    }
  };

  // Determine orb state
  const orbClass = isSpeaking
    ? "jarvis-orb-speaking"
    : isListening
    ? "jarvis-orb-listening"
    : "jarvis-orb-idle";

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-jarvis-gold/20 border border-jarvis-gold/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-jarvis-gold" />
          </div>
          <h1 className="font-orbitron text-lg tracking-wider text-text-primary">JARVIS <span className="text-sm text-text-muted font-jetbrains">(Client Name)</span></h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="cost-badge px-2 py-1 rounded-full font-jetbrains">
            ${usage.todayCost.toFixed(4)} today
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg hover:bg-[#1e1e24] border border-transparent hover:border-jarvis-gold/20 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-text-muted hover:text-jarvis-gold transition-colors" />
          </button>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-steel-mid'}`} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center gap-8">
        {/* Conversation Messages */}
        {messages.length > 0 && (
          <div className="w-full max-h-[40vh] overflow-y-auto space-y-3 mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`fade-up flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-steel-dark/80 text-text-primary rounded-br-md"
                      : "transcript-bubble text-text-primary rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Live AI transcript */}
            {aiTranscript && (
              <div className="flex justify-start fade-up">
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-md transcript-bubble text-sm text-text-secondary italic">
                  {aiTranscript}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Jarvis Orb */}
        <div className="relative flex items-center justify-center">
          {/* Orbit rings (only when active) */}
          {isActive && (
            <>
              <div className="orbit-ring" />
              <div className="orbit-ring-2" />
            </>
          )}

          {/* Main Orb */}
          <button
            onClick={handleToggle}
            className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${orbClass}`}
          >
            {/* Inner icon */}
            <div className="flex flex-col items-center gap-2">
              {isActive ? (
                <>
                  {isSpeaking ? (
                    <Brain className="w-10 h-10 text-jarvis-gold" />
                  ) : isListening ? (
                    <Mic className="w-10 h-10 text-jarvis-gold" />
                  ) : (
                    <Power className="w-10 h-10 text-jarvis-gold" />
                  )}
                  <span className="text-xs font-jetbrains text-jarvis-gold/80 tracking-wider">
                    {isSpeaking ? "SPEAKING" : isListening ? "LISTENING" : "READY"}
                  </span>
                </>
              ) : (
                <>
                  <Power className="w-10 h-10 text-jarvis-gold/60" />
                  <span className="text-xs font-jetbrains text-jarvis-gold/40 tracking-wider">
                    TAP TO START
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Status text */}
        <div className="text-center space-y-1">
          {!isActive && messages.length === 0 && (
            <>
              <p className="text-text-secondary text-sm">{getGreeting()}. Tap the orb to activate Jarvis.</p>
              <p className="text-text-muted text-xs">Voice assistant ready</p>
            </>
          )}
          {error && (
            <p className="text-error text-xs px-4 py-2 bg-error/10 rounded-lg border border-error/20">
              {error}
            </p>
          )}
          {userTranscript && isActive && (
            <p className="text-text-muted text-xs italic">You: {userTranscript}</p>
          )}
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="w-full max-w-2xl mt-8 pt-4 border-t border-steel-dark/50">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5" />
              {usage.totalConversations} conversations
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              ${usage.totalCost.toFixed(4)} total
            </span>
          </div>
          <span className="font-jetbrains text-[10px] text-text-muted/60">
            GPT-4o Mini Realtime
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

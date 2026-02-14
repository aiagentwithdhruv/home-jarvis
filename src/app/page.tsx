"use client";

import { useState, useEffect, useRef } from "react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { Mic, Power, Zap, Brain, ListTodo, Settings, Send, Loader2 } from "lucide-react";
import { SettingsModal } from "@/components/settings-modal";

interface Message {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: Date;
  source?: "voice" | "text";
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
  const [textInput, setTextInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          { id: `user_${Date.now()}`, role: "user", text: text.trim(), timestamp: new Date(), source: "voice" },
        ]);
      }
    },
    onAIResponse: (text) => {
      if (text.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: `jarvis_${Date.now()}`, role: "jarvis", text: text.trim(), timestamp: new Date(), source: "voice" },
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
  }, [messages, aiTranscript, isTyping]);

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

  // Text chat via Euri
  const handleSendText = async () => {
    const text = textInput.trim();
    if (!text || isTyping) return;

    // Add user message
    const userMsg: Message = {
      id: `user_text_${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date(),
      source: "text",
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput("");
    setIsTyping(true);

    // Build chat history for context
    const newHistory = [...chatHistory, { role: "user" as const, content: text }];
    setChatHistory(newHistory);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const aiText = data.content || "I couldn't generate a response.";

      // Add AI response
      setMessages((prev) => [
        ...prev,
        { id: `jarvis_text_${Date.now()}`, role: "jarvis", text: aiText, timestamp: new Date(), source: "text" },
      ]);

      // Update chat history
      setChatHistory([...newHistory, { role: "assistant", content: aiText }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect";
      setMessages((prev) => [
        ...prev,
        { id: `error_${Date.now()}`, role: "jarvis", text: `Error: ${errorMsg}`, timestamp: new Date(), source: "text" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
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
      <main className="flex-1 w-full max-w-2xl flex flex-col items-center justify-center gap-6">
        {/* Conversation Messages */}
        {messages.length > 0 && (
          <div className="w-full max-h-[40vh] overflow-y-auto space-y-3 mb-2">
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
                  {msg.source === "text" && (
                    <span className="block text-[10px] text-text-muted/40 mt-1 font-jetbrains">
                      {msg.role === "jarvis" ? "via Euri" : "text"}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Live AI transcript (voice) */}
            {aiTranscript && (
              <div className="flex justify-start fade-up">
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-md transcript-bubble text-sm text-text-secondary italic">
                  {aiTranscript}
                </div>
              </div>
            )}

            {/* Typing indicator (text) */}
            {isTyping && (
              <div className="flex justify-start fade-up">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md transcript-bubble text-sm text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Thinking...
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
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${orbClass}`}
          >
            {/* Inner icon */}
            <div className="flex flex-col items-center gap-2">
              {isActive ? (
                <>
                  {isSpeaking ? (
                    <Brain className="w-9 h-9 text-jarvis-gold" />
                  ) : isListening ? (
                    <Mic className="w-9 h-9 text-jarvis-gold" />
                  ) : (
                    <Power className="w-9 h-9 text-jarvis-gold" />
                  )}
                  <span className="text-xs font-jetbrains text-jarvis-gold/80 tracking-wider">
                    {isSpeaking ? "SPEAKING" : isListening ? "LISTENING" : "READY"}
                  </span>
                </>
              ) : (
                <>
                  <Power className="w-9 h-9 text-jarvis-gold/60" />
                  <span className="text-[10px] font-jetbrains text-jarvis-gold/40 tracking-wider">
                    TAP FOR VOICE
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
              <p className="text-text-secondary text-sm">{getGreeting()}. Tap the orb for voice, or type below.</p>
              <p className="text-text-muted text-xs">Voice + text assistant ready</p>
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

        {/* Text Input Bar */}
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 p-2 bg-[#141418] border border-[#3a3a44]/60 rounded-xl focus-within:border-jarvis-gold/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isTyping}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted/40 px-3 py-2 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isTyping}
              className="p-2.5 rounded-lg bg-jarvis-gold/20 border border-jarvis-gold/30 text-jarvis-gold hover:bg-jarvis-gold/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-text-muted/40 text-center mt-1 font-jetbrains">
            Powered by Euri (Gemini 2.5 Flash) &middot; 200K tokens/day free
          </p>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="w-full max-w-2xl mt-6 pt-4 border-t border-steel-dark/50">
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
            Voice: GPT-4o Mini &middot; Text: Euri
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

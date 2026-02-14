"use client";

import { useState, useEffect } from "react";
import { Settings, X, Key, Check, AlertCircle, MessageSquare } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [euriKey, setEuriKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [keySource, setKeySource] = useState<"none" | "user" | "server">("none");
  const [euriKeySource, setEuriKeySource] = useState<"none" | "user" | "server">("none");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          setKeySource(data.keySource);
          setEuriKeySource(data.euri?.keySource || "none");
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSaveOpenAI = async () => {
    if (!apiKey.trim()) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openai_api_key: apiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("saved");
        setMessage("OpenAI key saved! Tap the orb for voice.");
        setKeySource("user");
        setApiKey("");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  };

  const handleSaveEuri = async () => {
    if (!euriKey.trim()) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ euri_api_key: euriKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("saved");
        setMessage("Euri key saved! Type to chat.");
        setEuriKeySource("user");
        setEuriKey("");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  };

  const handleRemoveOpenAI = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openai_api_key: null }),
      });
      setKeySource("none");
      setMessage("OpenAI key removed");
      setStatus("saved");
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 2000);
    } catch {
      setMessage("Failed to remove key");
    }
  };

  const handleRemoveEuri = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ euri_api_key: null }),
      });
      setEuriKeySource("none");
      setMessage("Euri key removed");
      setStatus("saved");
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 2000);
    } catch {
      setMessage("Failed to remove key");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#141418] border border-[#3a3a44] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3a3a44]/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-jarvis-gold" />
            <h2 className="font-orbitron text-sm tracking-wider text-text-primary">SETTINGS</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1e1e24] transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Key Status Overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1e1e24] border border-[#3a3a44]/30">
              <div className={`w-2.5 h-2.5 rounded-full ${keySource !== "none" ? "bg-green-500" : "bg-red-500"}`} />
              <div className="text-sm flex-1">
                <span className="text-text-muted text-xs">Voice:</span>{" "}
                {keySource === "user" && <span className="text-text-secondary">Your OpenAI key</span>}
                {keySource === "server" && <span className="text-text-secondary">Server key</span>}
                {keySource === "none" && <span className="text-red-400">Not configured</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1e1e24] border border-[#3a3a44]/30">
              <div className={`w-2.5 h-2.5 rounded-full ${euriKeySource !== "none" ? "bg-green-500" : "bg-red-500"}`} />
              <div className="text-sm flex-1">
                <span className="text-text-muted text-xs">Text:</span>{" "}
                {euriKeySource === "user" && <span className="text-text-secondary">Your Euri key</span>}
                {euriKeySource === "server" && <span className="text-text-secondary">Server key</span>}
                {euriKeySource === "none" && <span className="text-red-400">Not configured</span>}
              </div>
              <span className="text-[10px] text-green-400/60 font-jetbrains">FREE</span>
            </div>
          </div>

          {/* OpenAI Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-text-muted font-jetbrains tracking-wider">
              <Key className="w-3.5 h-3.5" />
              OPENAI API KEY (VOICE)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setStatus("idle"); setMessage(""); }}
              placeholder="sk-proj-..."
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#3a3a44] rounded-xl text-sm text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-jarvis-gold/50 font-jetbrains transition-colors"
            />
            <p className="text-[11px] text-text-muted/60">
              Get key from{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-jarvis-gold/70 hover:text-jarvis-gold underline">
                platform.openai.com
              </a>
              . Required for voice chat.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSaveOpenAI}
                disabled={!apiKey.trim() || status === "saving"}
                className="flex-1 px-4 py-2 bg-jarvis-gold/20 border border-jarvis-gold/40 text-jarvis-gold rounded-xl text-sm font-medium hover:bg-jarvis-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Save
              </button>
              {keySource === "user" && (
                <button
                  onClick={handleRemoveOpenAI}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs hover:bg-red-500/20 transition-all"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#3a3a44]/30" />

          {/* Euri Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-text-muted font-jetbrains tracking-wider">
              <MessageSquare className="w-3.5 h-3.5" />
              EURI API KEY (TEXT CHAT)
              <span className="text-[10px] text-green-400/80 ml-1">200K tokens/day FREE</span>
            </label>
            <input
              type="password"
              value={euriKey}
              onChange={(e) => { setEuriKey(e.target.value); setStatus("idle"); setMessage(""); }}
              placeholder="your-euri-api-key..."
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#3a3a44] rounded-xl text-sm text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-jarvis-gold/50 font-jetbrains transition-colors"
            />
            <p className="text-[11px] text-text-muted/60">
              Get free key from{" "}
              <a href="https://euron.one/euri" target="_blank" rel="noopener noreferrer" className="text-jarvis-gold/70 hover:text-jarvis-gold underline">
                euron.one/euri
              </a>
              . Powers text chat with 20+ AI models.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSaveEuri}
                disabled={!euriKey.trim() || status === "saving"}
                className="flex-1 px-4 py-2 bg-jarvis-gold/20 border border-jarvis-gold/40 text-jarvis-gold rounded-xl text-sm font-medium hover:bg-jarvis-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Save
              </button>
              {euriKeySource === "user" && (
                <button
                  onClick={handleRemoveEuri}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs hover:bg-red-500/20 transition-all"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              status === "saved" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
              status === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : ""
            }`}>
              {status === "saved" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

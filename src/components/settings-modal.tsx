"use client";

import { useState, useEffect } from "react";
import { Settings, X, Key, Check, AlertCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [keySource, setKeySource] = useState<"none" | "user" | "server">("none");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => setKeySource(data.keySource))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSave = async () => {
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
        setMessage("API key saved! Tap the orb to start.");
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

  const handleRemove = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openai_api_key: null }),
      });
      setKeySource("none");
      setMessage("API key removed");
      setStatus("saved");
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 2000);
    } catch {
      setMessage("Failed to remove key");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#141418] border border-[#3a3a44] rounded-2xl shadow-2xl">
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
          {/* API Key Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1e1e24] border border-[#3a3a44]/30">
            <div className={`w-2.5 h-2.5 rounded-full ${keySource !== "none" ? "bg-green-500" : "bg-red-500"}`} />
            <div className="text-sm">
              {keySource === "user" && <span className="text-text-secondary">Using your API key</span>}
              {keySource === "server" && <span className="text-text-secondary">Using server API key</span>}
              {keySource === "none" && <span className="text-red-400">No API key configured</span>}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-text-muted font-jetbrains tracking-wider">
              <Key className="w-3.5 h-3.5" />
              OPENAI API KEY
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setStatus("idle"); setMessage(""); }}
              placeholder="sk-proj-..."
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#3a3a44] rounded-xl text-sm text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-jarvis-gold/50 font-jetbrains transition-colors"
            />
            <p className="text-[11px] text-text-muted/60">
              Get your key from{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-jarvis-gold/70 hover:text-jarvis-gold underline">
                platform.openai.com
              </a>
              . Stored securely as an HTTP-only cookie.
            </p>
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

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || status === "saving"}
              className="flex-1 px-4 py-2.5 bg-jarvis-gold/20 border border-jarvis-gold/40 text-jarvis-gold rounded-xl text-sm font-medium hover:bg-jarvis-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {status === "saving" ? "Saving..." : "Save Key"}
            </button>
            {keySource === "user" && (
              <button
                onClick={handleRemove}
                className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-all"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

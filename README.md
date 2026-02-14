# Jarvis - Home Voice AI Assistant

A real-time voice AI assistant powered by OpenAI's Realtime API. Talk naturally, get instant responses with <300ms latency.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/aiagentwithdhruv/home-jarvis.git
cd home-jarvis

# 2. Install
npm install

# 3. Run
npm run dev
```

Open **http://localhost:3000** in your browser.

## Setup Your API Key

1. Click the **gear icon** (top-right corner)
2. Paste your OpenAI API key (get one from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
3. Click **Save Key**
4. Tap the orb to start talking

> Your key is stored as a secure HTTP-only cookie. Never exposed to browser JS.

## What It Does

- **Voice Chat** — Talk naturally, Jarvis responds in real-time (Onyx voice)
- **Memory** — Remembers your preferences, facts, and routines across sessions
- **Tasks** — Say "Add a task to buy groceries" and it saves it. Say "Show my tasks" to list them
- **Cost Tracking** — See per-session and daily cost in the header

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, TailwindCSS |
| Voice | OpenAI Realtime API (WebSocket) |
| Audio | PCM16 @ 24kHz, server-side VAD |
| Memory | JSON file persistence (500 entries) |
| Tasks | CRUD via voice commands |
| Security | HTTP-only cookies, ephemeral tokens |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main UI (orb + chat)
│   ├── layout.tsx                  # Fonts + theme
│   ├── globals.css                 # Orb animations + glow effects
│   └── api/
│       ├── ai/realtime-token/      # Ephemeral token generation
│       ├── settings/               # API key management
│       ├── usage/                  # Cost tracking
│       └── tools/
│           ├── save_memory/        # Persist memories
│           ├── recall_memory/      # Search memories
│           └── manage_task/        # CRUD tasks
├── hooks/
│   └── useRealtimeVoice.ts         # React hook for voice
├── components/
│   ├── settings-modal.tsx          # API key settings
│   └── client-only.tsx             # SSR guard
└── lib/
    ├── voice.ts                    # WebSocket voice engine
    ├── memory.ts                   # Memory + task store
    ├── jarvis-context.ts           # System prompt
    └── pricing.ts                  # Cost calculation
```

## Requirements

- **Node.js 18+**
- **OpenAI API key** with Realtime API access
- **Browser** with microphone support (Chrome/Edge recommended)
- Works on localhost or HTTPS (voice requires secure context)

## Estimated Monthly Cost

| Usage | Cost |
|-------|------|
| Light (15 min/day) | ~$15-25/month |
| Medium (30 min/day) | ~$35-50/month |
| Heavy (1+ hr/day) | ~$60-90/month |

Uses GPT-4o Mini Realtime by default (10x cheaper than GPT-4o Realtime).

## Optional: Run with .env.local

Instead of the Settings UI, you can set your key in a file:

```bash
cp .env.example .env.local
# Edit .env.local and add your key:
# OPENAI_API_KEY=sk-proj-your-key-here
```

## Built By

[AiwithDhruv](https://github.com/aiagentwithdhruv) — AI automation & voice systems

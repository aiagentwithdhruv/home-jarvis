# Jarvis - Home Voice + Text AI Assistant

A personal home AI assistant with **real-time voice** (OpenAI Realtime API) and **free text chat** powered by [Euri by Euron](https://euron.one/euri). Talk naturally or type — Jarvis handles both.

> Exclusively available for the **Euron community** — 200,000 free tokens every day to chat with 20+ AI models including GPT-5, Gemini 2.5, Llama 4, and more.

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

## Setup API Keys

Click the **gear icon** (top-right) to open Settings.

### Text Chat — Euri API (FREE)

Jarvis text chat is powered by **Euri**, Euron's free AI API gateway. Get your free key in 30 seconds:

1. Go to [euron.one/euri](https://euron.one/euri)
2. Sign up / log in to your Euron account
3. Copy your API key
4. Paste it in Jarvis Settings under **EURI API KEY (TEXT CHAT)**
5. Click **Save** — start typing to chat!

**What you get for FREE:**
- 200,000 tokens per day (resets at midnight UTC)
- 20+ AI models from 6 providers (Google, OpenAI, Meta, Groq, Alibaba, Together)
- Switch models anytime from the dropdown above the text input
- No credit card required

### Voice Chat — OpenAI API (Paid)

For real-time voice conversations:

1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Paste it in Settings under **OPENAI API KEY (VOICE)**
3. Click **Save** — tap the orb to start talking

> All keys are stored as secure HTTP-only cookies. Never exposed to browser JS.

## What It Does

- **Voice Chat** — Talk naturally, Jarvis responds in real-time with a male voice (Ash)
- **Text Chat** — Type messages, get AI responses via Euri (free, 20+ models)
- **Model Selector** — Pick from GPT-5 Nano, Gemini 2.5 Flash, Llama 4 Scout, Groq Compound (web search), and more
- **Memory** — Remembers your preferences, facts, and routines across sessions (3-tier: short-term, long-term, working)
- **Tasks** — Say or type "Add a task to buy groceries" and it saves it
- **Cost Tracking** — See per-session and daily voice cost in the header

## Available Text Models (via Euri)

| Provider | Models | Best For |
|----------|--------|----------|
| Google | Gemini 2.5 Flash, Pro, 2.0 Flash, Flash Lite | General purpose, fast |
| OpenAI | GPT-5 Nano/Mini, GPT-4.1 Nano/Mini, GPT-OSS 20B/120B | Code, reasoning |
| Meta | Llama 4 Scout/Maverick, Llama 3.3 70B, 3.1 8B | Versatile, open-source |
| Groq | Compound, Compound Mini | Web search built-in |
| Alibaba | Qwen 3 32B | Multilingual, math |

All models are **free** with your Euri API key — 200K tokens/day.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, TailwindCSS |
| Voice | OpenAI Realtime API (WebSocket, GPT-4o Mini) |
| Text Chat | Euri API (OpenAI-compatible, 20+ models) |
| Audio | PCM16 @ 24kHz, server-side VAD |
| Memory | 3-tier JSON persistence (500 entries) |
| Tasks | CRUD via voice or text commands |
| Security | HTTP-only cookies, ephemeral tokens |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main UI (orb + text input + chat)
│   ├── layout.tsx                  # Fonts + theme
│   ├── globals.css                 # Orb animations + glow effects
│   └── api/
│       ├── ai/realtime-token/      # Voice: ephemeral token generation
│       ├── chat/                   # Text: Euri chat completions
│       ├── settings/               # API key management (OpenAI + Euri)
│       ├── usage/                  # Cost tracking
│       └── tools/
│           ├── save_memory/        # Persist memories
│           ├── recall_memory/      # Search memories
│           └── manage_task/        # CRUD tasks
├── hooks/
│   └── useRealtimeVoice.ts         # React hook for voice
├── components/
│   ├── settings-modal.tsx          # API key settings (both keys)
│   └── client-only.tsx             # SSR guard
└── lib/
    ├── voice.ts                    # WebSocket voice engine
    ├── memory.ts                   # 3-tier memory + task store
    ├── jarvis-context.ts           # System prompt
    ├── euri-client.ts              # Euri API client
    ├── euri-models.ts              # 24 model definitions
    └── pricing.ts                  # Cost calculation
```

## Requirements

- **Node.js 18+**
- **Euri API key** (free) — for text chat ([get it here](https://euron.one/euri))
- **OpenAI API key** (paid, optional) — for voice chat
- **Browser** with microphone support (Chrome/Edge recommended)
- Works on localhost or HTTPS (voice requires secure context)

## Estimated Monthly Cost

| Feature | Cost |
|---------|------|
| Text chat (Euri) | **$0/month** (200K tokens/day free) |
| Voice - Light (15 min/day) | ~$15-25/month |
| Voice - Medium (30 min/day) | ~$35-50/month |
| Voice - Heavy (1+ hr/day) | ~$60-90/month |

Text chat is completely free via Euri. Voice uses GPT-4o Mini Realtime (10x cheaper than GPT-4o Realtime).

## Optional: Run with .env.local

Instead of the Settings UI, you can set your keys in a file:

```bash
cp .env.example .env.local
# Edit .env.local and add your keys:
# OPENAI_API_KEY=sk-proj-your-key-here
# EURI_API_KEY=your-euri-key-here
```

## Built By

[AiwithDhruv](https://github.com/aiagentwithdhruv) — AI automation & voice systems

Text chat powered by [Euri by Euron](https://euron.one/euri) — free AI for the Euron community.

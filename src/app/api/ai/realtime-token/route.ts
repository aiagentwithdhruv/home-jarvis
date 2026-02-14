import { NextResponse } from "next/server";
import { JARVIS_SYSTEM_PROMPT } from "@/lib/jarvis-context";
import { memory } from "@/lib/memory";
import { cookies } from "next/headers";

const DEFAULT_REALTIME_MODEL = "gpt-4o-mini-realtime-preview-2024-12-17";
const ALLOWED_MODELS = [
  "gpt-4o-mini-realtime-preview-2024-12-17",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-realtime-mini",
  "gpt-realtime",
];

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userApiKey = cookieStore.get("openai_api_key")?.value;
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "No OpenAI API key. Go to Settings to add yours." }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const voice = body.voice || "ash";
    const REALTIME_MODEL = ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_REALTIME_MODEL;

    const memoryContext = memory.getMemoryContext();
    const instructions = memoryContext
      ? `${JARVIS_SYSTEM_PROMPT}\n\n${memoryContext}`
      : JARVIS_SYSTEM_PROMPT;

    const realtimeTools = [
      {
        type: "function",
        name: "manage_task",
        description: "Create, update, or list tasks. ALWAYS call this for any task/todo/reminder request.",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", description: "create, update, or list" },
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Task details" },
            priority: { type: "string", description: "low, medium, or high" },
            status: { type: "string", description: "pending, in_progress, or completed" },
          },
        },
      },
      {
        type: "function",
        name: "save_memory",
        description: "Save information to persistent memory. Auto-save preferences, routines, facts, and decisions.",
        parameters: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Short identifier" },
            content: { type: "string", description: "Detailed info to remember" },
            type: { type: "string", description: "fact, preference, decision, routine, or task" },
            importance: { type: "string", description: "high, medium, or low" },
          },
          required: ["topic", "content"],
        },
      },
      {
        type: "function",
        name: "recall_memory",
        description: "Search memory for previously saved info. Use when asked 'do you remember' or when past context helps.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            type: { type: "string", description: "Optional filter: fact, preference, decision, routine, task" },
          },
        },
      },
    ];

    // GA Realtime API — minimal config (most params set via session.update)
    const sessionConfig = {
      type: "realtime" as const,
      model: REALTIME_MODEL,
      instructions,
      tools: realtimeTools,
      audio: {
        output: { voice },
      },
    };

    console.log("[Jarvis] Creating session, voice:", voice, "model:", REALTIME_MODEL);

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionConfig }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Jarvis] client_secrets FAILED:", response.status, JSON.stringify(errorData));

      // Fallback: return raw API key (voice will be default)
      return NextResponse.json({
        token: apiKey,
        type: "api_key",
        model: REALTIME_MODEL,
        instructions,
        tools: realtimeTools,
      });
    }

    const data = await response.json();
    console.log("[Jarvis] client_secrets SUCCESS — ephemeral token created, voice:", voice);

    return NextResponse.json({
      token: data.client_secret?.value || data.value || apiKey,
      type: (data.client_secret?.value || data.value) ? "ephemeral" : "api_key",
      expiresAt: data.client_secret?.expires_at || data.expires_at,
      model: REALTIME_MODEL,
      voice,
      tools: realtimeTools,
      instructions,
    });
  } catch (err) {
    console.error("[Jarvis] Token route error:", err);
    return NextResponse.json({ token: apiKey, type: "api_key", model: DEFAULT_REALTIME_MODEL });
  }
}

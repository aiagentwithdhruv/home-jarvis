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
  // Check for user-provided API key (from cookie), then fall back to env
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

    // Inject memory context into instructions
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

    const sessionConfig = {
      type: "realtime" as const,
      model: REALTIME_MODEL,
      instructions,
      voice,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "whisper-1", language: "en" },
      turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 800, create_response: true },
      tools: realtimeTools,
    };

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionConfig }),
    });

    if (!response.ok) {
      return NextResponse.json({
        token: apiKey,
        type: "api_key",
        model: REALTIME_MODEL,
        instructions,
        tools: realtimeTools,
      });
    }

    const data = await response.json();
    return NextResponse.json({
      token: data.value || apiKey,
      type: data.value ? "ephemeral" : "api_key",
      expiresAt: data.expires_at,
      model: REALTIME_MODEL,
      voice,
      tools: realtimeTools,
      instructions,
    });
  } catch {
    return NextResponse.json({ token: apiKey, type: "api_key", model: DEFAULT_REALTIME_MODEL });
  }
}

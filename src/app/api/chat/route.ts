import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JARVIS_SYSTEM_PROMPT } from "@/lib/jarvis-context";
import { memory } from "@/lib/memory";

const EURI_BASE_URL = "https://api.euron.one/api/v1/euri";
const DEFAULT_MODEL = "gemini-2.5-flash";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userApiKey = cookieStore.get("euri_api_key")?.value;
  const apiKey = userApiKey || process.env.EURI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "No Euri API key. Go to Settings to add yours." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const userMessages: ChatMessage[] = body.messages || [];
    const model = body.model || DEFAULT_MODEL;

    if (userMessages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Build system prompt with memory context
    const memoryContext = memory.getMemoryContext();
    const systemPrompt = memoryContext
      ? `${JARVIS_SYSTEM_PROMPT}\n\n${memoryContext}`
      : JARVIS_SYSTEM_PROMPT;

    // Prepend system message
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];

    console.log("[Jarvis Text] Sending to Euri, model:", model, "messages:", messages.length);

    const res = await fetch(`${EURI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("[Jarvis Text] Euri error:", res.status, errorData);
      return NextResponse.json(
        { error: `Euri API error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Extract content — Euri can return string or array format
    let content = data.choices?.[0]?.message?.content || "";
    if (Array.isArray(content)) {
      content = content
        .filter((p: { type: string; text: string }) => p.type === "text")
        .map((p: { type: string; text: string }) => p.text)
        .join("");
    }

    console.log("[Jarvis Text] Response received, tokens:", data.usage?.total_tokens);

    return NextResponse.json({
      content,
      model: data.model || model,
      usage: data.usage,
    });
  } catch (err) {
    console.error("[Jarvis Text] Error:", err);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}

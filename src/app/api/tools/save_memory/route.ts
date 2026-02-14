import { NextResponse } from "next/server";
import { memory } from "@/lib/memory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, content, type = "fact", importance = "medium" } = body;

    if (!topic || !content) {
      return NextResponse.json({ error: "topic and content required" }, { status: 400 });
    }

    const entry = memory.add({
      topic,
      content,
      type: type as any,
      tags: [topic.toLowerCase(), type],
      importance: importance as any,
    });

    return NextResponse.json({ success: true, id: entry.id, message: `Saved: ${topic}` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
  }
}

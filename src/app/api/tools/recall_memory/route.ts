import { NextResponse } from "next/server";
import { memory } from "@/lib/memory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, type } = body;

    let results;
    if (query) {
      results = memory.search(query);
    } else if (type) {
      results = memory.getByType(type);
    } else {
      results = memory.getRecent(10);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      memories: results.slice(0, 10).map(e => ({
        topic: e.topic,
        content: e.content,
        type: e.type,
        importance: e.importance,
        date: e.timestamp,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to recall memory" }, { status: 500 });
  }
}

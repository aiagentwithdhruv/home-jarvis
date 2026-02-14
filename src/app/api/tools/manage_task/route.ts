import { NextResponse } from "next/server";
import { tasks } from "@/lib/memory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, title, description, priority, status } = body;

    switch (action) {
      case "create": {
        if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
        const task = tasks.create(title, description, priority || "medium");
        return NextResponse.json({ success: true, task, message: `Task created: ${title}` });
      }

      case "update": {
        if (!title) return NextResponse.json({ error: "title required to find task" }, { status: 400 });
        const updates: any = {};
        if (status) updates.status = status;
        if (priority) updates.priority = priority;
        const updated = tasks.update(title, updates);
        if (!updated) return NextResponse.json({ error: `Task not found: ${title}` }, { status: 404 });
        return NextResponse.json({ success: true, task: updated, message: `Task updated: ${updated.title} -> ${status || 'updated'}` });
      }

      case "list":
      default: {
        const list = tasks.list(status);
        return NextResponse.json({
          success: true,
          count: list.length,
          tasks: list.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            createdAt: t.createdAt,
          })),
        });
      }
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to manage task" }, { status: 500 });
  }
}

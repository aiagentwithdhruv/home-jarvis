import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { openai_api_key } = body;

    const cookieStore = await cookies();

    if (openai_api_key === null || openai_api_key === "") {
      // Clear the cookie
      cookieStore.delete("openai_api_key");
      return NextResponse.json({ success: true, message: "API key removed" });
    }

    if (typeof openai_api_key !== "string" || !openai_api_key.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid OpenAI API key format. Must start with 'sk-'" }, { status: 400 });
    }

    // Set as httpOnly cookie (30 days)
    cookieStore.set("openai_api_key", openai_api_key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return NextResponse.json({ success: true, message: "API key saved" });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const hasKey = !!cookieStore.get("openai_api_key")?.value;
  const hasEnvKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    hasUserKey: hasKey,
    hasEnvKey,
    keySource: hasKey ? "user" : hasEnvKey ? "server" : "none",
  });
}

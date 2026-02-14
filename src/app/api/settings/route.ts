import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { openai_api_key, euri_api_key } = body;

    const cookieStore = await cookies();

    // Handle OpenAI key
    if (openai_api_key !== undefined) {
      if (openai_api_key === null || openai_api_key === "") {
        cookieStore.delete("openai_api_key");
      } else if (typeof openai_api_key === "string" && openai_api_key.startsWith("sk-")) {
        cookieStore.set("openai_api_key", openai_api_key, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
      } else {
        return NextResponse.json({ error: "Invalid OpenAI API key format. Must start with 'sk-'" }, { status: 400 });
      }
    }

    // Handle Euri key
    if (euri_api_key !== undefined) {
      if (euri_api_key === null || euri_api_key === "") {
        cookieStore.delete("euri_api_key");
      } else if (typeof euri_api_key === "string" && euri_api_key.trim().length > 10) {
        cookieStore.set("euri_api_key", euri_api_key.trim(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
      } else {
        return NextResponse.json({ error: "Invalid Euri API key" }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const hasOpenAIKey = !!cookieStore.get("openai_api_key")?.value;
  const hasOpenAIEnvKey = !!process.env.OPENAI_API_KEY;
  const hasEuriKey = !!cookieStore.get("euri_api_key")?.value;
  const hasEuriEnvKey = !!process.env.EURI_API_KEY;

  return NextResponse.json({
    hasUserKey: hasOpenAIKey,
    hasEnvKey: hasOpenAIEnvKey,
    keySource: hasOpenAIKey ? "user" : hasOpenAIEnvKey ? "server" : "none",
    euri: {
      hasUserKey: hasEuriKey,
      hasEnvKey: hasEuriEnvKey,
      keySource: hasEuriKey ? "user" : hasEuriEnvKey ? "server" : "none",
    },
  });
}

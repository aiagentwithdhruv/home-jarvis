import { NextResponse } from "next/server";
import { calculateRealtimeCost } from "@/lib/pricing";
import fs from "fs";
import path from "path";

const USAGE_FILE = path.join(process.cwd(), "usage-data.json");

interface UsageEntry {
  timestamp: string;
  model: string;
  audioInputTokens: number;
  audioOutputTokens: number;
  textInputTokens: number;
  textOutputTokens: number;
  cost: number;
}

function readUsage(): UsageEntry[] {
  try {
    if (!fs.existsSync(USAGE_FILE)) return [];
    return JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
  } catch { return []; }
}

function writeUsage(entries: UsageEntry[]): void {
  fs.writeFileSync(USAGE_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { model, usage } = body;

    const audioIn = usage?.input_token_details?.audio_tokens || 0;
    const audioOut = usage?.output_token_details?.audio_tokens || 0;
    const textIn = usage?.input_token_details?.text_tokens || usage?.input_tokens || 0;
    const textOut = usage?.output_token_details?.text_tokens || usage?.output_tokens || 0;

    const cost = calculateRealtimeCost(model, audioIn, audioOut, textIn, textOut);

    const entry: UsageEntry = {
      timestamp: new Date().toISOString(),
      model,
      audioInputTokens: audioIn,
      audioOutputTokens: audioOut,
      textInputTokens: textIn,
      textOutputTokens: textOut,
      cost,
    };

    const entries = readUsage();
    entries.unshift(entry);
    if (entries.length > 1000) entries.length = 1000;
    writeUsage(entries);

    return NextResponse.json({ success: true, cost });
  } catch {
    return NextResponse.json({ error: "Failed to log usage" }, { status: 500 });
  }
}

export async function GET() {
  const entries = readUsage();
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCost = entries.filter(e => e.timestamp.startsWith(todayStr)).reduce((sum, e) => sum + e.cost, 0);

  return NextResponse.json({
    totalConversations: entries.length,
    totalCost: Math.round(totalCost * 10000) / 10000,
    todayCost: Math.round(todayCost * 10000) / 10000,
  });
}

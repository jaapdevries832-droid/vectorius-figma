import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type Mode = "tutor" | "checker" | "explainer";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

async function readPrompt(name: string): Promise<string> {
  const filePath = path.join(PROMPTS_DIR, name);
  const buf = await fs.readFile(filePath);
  return buf.toString("utf-8");
}

function isEnabled() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  return Boolean(endpoint && apiKey && deployment);
}

export async function GET() {
  try {
    return NextResponse.json({ enabled: isEnabled() });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

interface HistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!isEnabled()) {
      return NextResponse.json(
        { error: "Chat is not enabled. Missing Azure OpenAI configuration." },
        { status: 503 }
      );
    }

    const { question, mode, history }: { question?: string; mode?: Mode; history?: HistoryMessage[] } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Invalid 'question'" }, { status: 400 });
    }

    const selectedMode: Mode = (mode === "checker" || mode === "explainer" || mode === "tutor") ? mode : "tutor";

    const temperatureMap: Record<Mode, number> = {
      tutor: 0.4,
      checker: 0.2,
      explainer: 0.5,
    };

    // Load prompts
    const [systemPrompt, modePrompt] = await Promise.all([
      readPrompt("grade8_system.md"),
      readPrompt(
        selectedMode === "tutor"
          ? "tutor_mode.md"
          : selectedMode === "checker"
          ? "checker_mode.md"
          : "explainer_mode.md"
      ),
    ]);

    // Build messages for Azure OpenAI Chat Completions
    const messages: HistoryMessage[] = [];
    messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "system", content: modePrompt });

    if (Array.isArray(history)) {
      for (const msg of history) {
        if (!msg || typeof msg.content !== "string") continue;
        const role = msg.role === "assistant" || msg.role === "system" ? msg.role : "user";
        messages.push({ role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: question });

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
    const apiKey = process.env.AZURE_OPENAI_API_KEY as string;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

    const url = new URL(`/openai/deployments/${deployment}/chat/completions`, endpoint);
    url.searchParams.set("api-version", apiVersion);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: temperatureMap[selectedMode],
        n: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Azure OpenAI error: ${response.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ reply, role: "assistant", modeUsed: selectedMode });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}


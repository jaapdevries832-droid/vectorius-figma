import { NextRequest, NextResponse } from "next/server";

type ParsedEvent = {
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  type?: string | null;
  all_day?: boolean;
  description?: string | null;
};

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_API_URL = "https://api.anthropic.com/v1/messages";

function isEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function POST(req: NextRequest) {
  try {
    if (!isEnabled()) {
      return NextResponse.json(
        { error: "Email parsing is not enabled. Missing Anthropic API key." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const rawText = typeof body?.text === "string" ? body.text : body?.rawText;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "Invalid email text." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY as string;
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const apiUrl = process.env.ANTHROPIC_API_URL || DEFAULT_API_URL;

    const systemPrompt = [
      "You extract calendar events from school emails.",
      "Return ONLY valid JSON: an array of objects with fields:",
      "title (string), date (YYYY-MM-DD), start_time (HH:MM 24h or null),",
      "end_time (HH:MM 24h or null), type (appointment|school_event|travel|extracurricular|study_block|other),",
      "all_day (boolean), description (string or null).",
      "If time is not provided, set all_day=true and leave start_time/end_time null.",
      "Do not include any additional keys or text.",
    ].join(" ");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: rawText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Anthropic error: ${response.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text ?? "";

    let events: ParsedEvent[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        events = parsed as ParsedEvent[];
      }
    } catch {
      return NextResponse.json({ error: "Unable to parse AI response." }, { status: 502 });
    }

    return NextResponse.json({ events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

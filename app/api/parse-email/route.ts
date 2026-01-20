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

function isEnabled() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  return Boolean(endpoint && apiKey && deployment);
}

export async function POST(req: NextRequest) {
  try {
    if (!isEnabled()) {
      return NextResponse.json(
        { error: "Email parsing is not enabled. Missing Azure OpenAI configuration." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const rawText = typeof body?.text === "string" ? body.text : body?.rawText;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "Invalid email text." }, { status: 400 });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
    const apiKey = process.env.AZURE_OPENAI_API_KEY as string;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

    const systemPrompt = [
      "You extract calendar events from school emails.",
      "Return ONLY valid JSON: an array of objects with fields:",
      "title (string), date (YYYY-MM-DD), start_time (HH:MM 24h or null),",
      "end_time (HH:MM 24h or null), type (appointment|school_event|travel|extracurricular|study_block|other),",
      "all_day (boolean), description (string or null).",
      "If time is not provided, set all_day=true and leave start_time/end_time null.",
      "Do not include any additional keys or text.",
    ].join(" ");

    const url = new URL(`/openai/deployments/${deployment}/chat/completions`, endpoint);
    url.searchParams.set("api-version", apiVersion);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
        temperature: 0.2,
        max_tokens: 800,
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
    const content = data?.choices?.[0]?.message?.content ?? "";

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

import { NextRequest, NextResponse } from "next/server";
import {
  buildAzureChatCompletionsUrl,
  buildAzureHeaders,
  getAzureConfig,
} from "@/lib/azure-openai";

type ScheduleHint = {
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
};

type Milestone = {
  title: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  type: "study_block";
};

export async function POST(req: NextRequest) {
  try {
    const azureConfig = getAzureConfig();
    if (!azureConfig) {
      return NextResponse.json(
        { error: "Study plan generation is not enabled. Missing Azure OpenAI configuration." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title : null;
    const dueDate = typeof body?.dueDate === "string" ? body.dueDate : null;
    const schedule = Array.isArray(body?.schedule) ? (body.schedule as ScheduleHint[]) : [];

    if (!title || !dueDate) {
      return NextResponse.json({ error: "Missing title or dueDate." }, { status: 400 });
    }

    const scheduleText = schedule.length
      ? schedule
          .map((item) => {
            const parts = [item.title, item.date, item.start_time, item.end_time].filter(Boolean);
            return parts.join(" | ");
          })
          .join("\n")
      : "No existing events provided.";

    const systemPrompt = [
      "You create study milestones for a student.",
      "Return ONLY valid JSON: an array of 3-6 objects with fields:",
      "title (string), date (YYYY-MM-DD), start_time (HH:MM 24h), duration_minutes (number), type ('study_block').",
      "Use dates between today and the due date. Avoid times that conflict with schedule hints when possible.",
      "Do not include any additional text.",
    ].join(" ");

    const userPrompt = [
      `Target: ${title}`,
      `Due date: ${dueDate}`,
      "Schedule hints:",
      scheduleText,
    ].join("\n");

    const response = await fetch(buildAzureChatCompletionsUrl(azureConfig), {
      method: "POST",
      headers: buildAzureHeaders(azureConfig),
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
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

    let milestones: Milestone[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        milestones = parsed as Milestone[];
      }
    } catch {
      return NextResponse.json({ error: "Unable to parse AI response." }, { status: 502 });
    }

    return NextResponse.json({ milestones });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  buildAzureChatCompletionsUrl,
  buildAzureHeaders,
  getAzureConfig,
  isAzureEnabled,
} from "@/lib/azure-openai";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getAzureVisionConfig,
  buildAzureVisionCompletionsUrl,
  buildAzureVisionHeaders,
} from "@/lib/azure-openai-vision";

type Mode = "tutor" | "checker" | "explainer" | "grade" | "parent_explainer";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

async function readPrompt(name: string): Promise<string> {
  const filePath = path.join(PROMPTS_DIR, name);
  const buf = await fs.readFile(filePath);
  return buf.toString("utf-8");
}

export async function GET() {
  try {
    return NextResponse.json({ enabled: isAzureEnabled() });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

interface HistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Extract image content via Azure OpenAI vision model.
 * Returns extracted text or empty string if extraction fails/not applicable.
 */
async function extractImageContent(attachmentId: string): Promise<string> {
  const supabase = createServiceClient();

  // Check for cached extraction
  const { data: existing } = await supabase
    .from("image_extractions")
    .select("extracted_text")
    .eq("attachment_id", attachmentId)
    .maybeSingle();

  if (existing?.extracted_text) {
    return existing.extracted_text;
  }

  // Get attachment record
  const { data: attachment } = await supabase
    .from("chat_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .single();

  if (!attachment) return "";

  // Generate signed URL (5 min)
  const { data: signedData } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(attachment.storage_path, 300);

  if (!signedData?.signedUrl) return "";

  const visionConfig = getAzureVisionConfig();
  if (!visionConfig) return "";

  // Call Azure Vision
  const visionResponse = await fetch(
    buildAzureVisionCompletionsUrl(visionConfig),
    {
      method: "POST",
      headers: buildAzureVisionHeaders(visionConfig),
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "Describe the contents of this image in detail. If it contains text, homework, math problems, or educational content, transcribe and identify it precisely.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "What is in this image?" },
              {
                type: "image_url",
                image_url: { url: signedData.signedUrl },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        n: 1,
        stream: false,
      }),
    }
  );

  if (!visionResponse.ok) return "";

  const visionData = await visionResponse.json();
  const extractedText =
    visionData?.choices?.[0]?.message?.content ?? "";
  const tokensUsed = visionData?.usage?.total_tokens ?? null;

  if (extractedText) {
    // Store extraction
    await supabase.from("image_extractions").insert({
      attachment_id: attachmentId,
      extracted_text: extractedText,
      model_used: visionConfig.visionDeployment,
      tokens_used: tokensUsed,
    });
  }

  return extractedText;
}

export async function POST(req: NextRequest) {
  try {
    const azureConfig = getAzureConfig();
    if (!azureConfig) {
      return NextResponse.json(
        { error: "Chat is not enabled. Missing Azure OpenAI configuration." },
        { status: 503 }
      );
    }

    const { question, mode, history, attachmentId }: {
      question?: string;
      mode?: Mode;
      history?: HistoryMessage[];
      attachmentId?: string;
    } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Invalid 'question'" }, { status: 400 });
    }

    const validModes: Mode[] = ["tutor", "checker", "explainer", "grade", "parent_explainer"];
    const selectedMode: Mode = validModes.includes(mode as Mode) ? (mode as Mode) : "tutor";

    const temperatureMap: Record<Mode, number> = {
      tutor: 0.4,
      checker: 0.2,
      explainer: 0.5,
      grade: 0.2,
      parent_explainer: 0.4,
    };

    // Vision extraction: if attachmentId provided, extract image content
    let imageContext = "";
    if (attachmentId && typeof attachmentId === "string") {
      try {
        imageContext = await extractImageContent(attachmentId);
      } catch (e) {
        console.error("Vision extraction failed:", e);
        // Non-fatal: continue without image context
      }
    }

    // Load prompts (parent modes get a different system prompt)
    const isParentMode = selectedMode === "grade" || selectedMode === "parent_explainer";

    const modePromptFile: Record<Mode, string> = {
      tutor: "tutor_mode.md",
      checker: "checker_mode.md",
      explainer: "explainer_mode.md",
      grade: "grade_mode.md",
      parent_explainer: "parent_explainer_mode.md",
    };

    const [systemPrompt, modePrompt] = await Promise.all([
      readPrompt(isParentMode ? "parent_system.md" : "grade8_system.md"),
      readPrompt(modePromptFile[selectedMode]),
    ]);

    // Build messages for Azure OpenAI Chat Completions
    const messages: HistoryMessage[] = [];
    messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "system", content: modePrompt });

    // Inject image context if available
    if (imageContext) {
      messages.push({
        role: "system",
        content: `The ${isParentMode ? "parent" : "student"} has shared an image. Here is a description of the image contents:\n\n${imageContext}\n\nUse this information to help answer their question.`,
      });
    }

    if (Array.isArray(history)) {
      for (const msg of history) {
        if (!msg || typeof msg.content !== "string") continue;
        const role = msg.role === "assistant" || msg.role === "system" ? msg.role : "user";
        messages.push({ role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: question });

    const response = await fetch(buildAzureChatCompletionsUrl(azureConfig), {
      method: "POST",
      headers: buildAzureHeaders(azureConfig),
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

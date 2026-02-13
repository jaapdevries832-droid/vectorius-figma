import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/auth-from-request";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getAuthUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // 3. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Allowed: jpg, png, heic`,
        },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 8MB`,
        },
        { status: 400 }
      );
    }

    // 5. Build storage path
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    // 6. Upload to Supabase Storage via service role
    const supabase = createServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // 7. Insert attachment record
    const { data: attachment, error: insertError } = await supabase
      .from("chat_attachments")
      .insert({
        uploader_user_id: user.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      .select("id, file_name, mime_type")
      .single();

    if (insertError || !attachment) {
      console.error("Insert error:", insertError);
      // Best-effort cleanup: remove the uploaded file
      await supabase.storage.from("chat-attachments").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to record attachment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attachmentId: attachment.id,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error";
    console.error("Upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

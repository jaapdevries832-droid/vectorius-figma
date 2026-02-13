import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/auth-from-request";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    // Verify ownership
    const { data: attachment, error } = await supabase
      .from("chat_attachments")
      .select("storage_path, uploader_user_id")
      .eq("id", id)
      .single();

    if (error || !attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (attachment.uploader_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate signed URL (10 minutes)
    const { data: signedData, error: signError } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(attachment.storage_path, 600);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

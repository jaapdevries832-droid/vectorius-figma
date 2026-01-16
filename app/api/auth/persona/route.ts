import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Magic link endpoint for AI persona testing.
 *
 * Usage:
 *   GET /api/auth/persona?token=<token>
 *
 * Flow:
 *   1. Validates the token from persona_tokens table
 *   2. Signs in as the linked test user using admin API
 *   3. Redirects to Supabase's auth callback with session tokens
 *   4. User ends up logged in on the appropriate dashboard
 *
 * Security:
 *   - Blocked in production (VERCEL_ENV check)
 *   - Tokens are single-use
 *   - Tokens expire after TTL
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Block in production
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production") {
      return NextResponse.json(
        { error: "Persona testing is disabled in production" },
        { status: 403 }
      );
    }

    // 2. Get token from query params
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token parameter" },
        { status: 400 }
      );
    }

    // 3. Look up token in database
    const supabase = createServiceClient();

    const { data: tokenRecord, error: tokenError } = await supabase
      .from("persona_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 4. Check token is not expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ error: "Token has expired" }, { status: 401 });
    }

    // 5. Check token is not already used
    if (tokenRecord.used_at) {
      return NextResponse.json(
        { error: "Token has already been used" },
        { status: 401 }
      );
    }

    // 6. Mark token as used
    await supabase
      .from("persona_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", tokenRecord.id);

    // 7. Get the test user
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(tokenRecord.user_id);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: "Test user not found" },
        { status: 500 }
      );
    }

    // 8. Generate a magic link that Supabase will process
    const baseUrl = getBaseUrl(request);
    const dashboardUrl = `${baseUrl}/${tokenRecord.role}`;

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
        options: {
          redirectTo: dashboardUrl,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate magic link:", linkError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // 9. Redirect to Supabase's magic link URL
    // This URL will set the session and redirect to the dashboard
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (error) {
    console.error("Persona auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get the base URL for redirects.
 * Handles localhost, Vercel preview, and custom domains.
 */
function getBaseUrl(request: NextRequest): string {
  // Use VERCEL_URL if available (includes branch name for previews)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // Fall back to request host
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

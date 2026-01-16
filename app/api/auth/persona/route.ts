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
 *   2. Creates a session directly using admin API
 *   3. Returns HTML that stores the session in localStorage and redirects
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

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Test user not found" },
        { status: 500 }
      );
    }

    // 8. Generate a session directly for this user
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email!,
      });

    if (sessionError || !sessionData) {
      console.error("Failed to generate session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // 9. Extract the token from the magic link and verify it to get a session
    const actionLink = sessionData.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json(
        { error: "Failed to create magic link" },
        { status: 500 }
      );
    }

    // Parse the token_hash from the action link
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get("token");
    const type = actionUrl.searchParams.get("type");

    if (!tokenHash) {
      return NextResponse.json(
        { error: "Failed to extract token" },
        { status: 500 }
      );
    }

    // 10. Verify the OTP to get actual session tokens
    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "magiclink",
      });

    if (verifyError || !verifyData.session) {
      console.error("Failed to verify OTP:", verifyError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // 11. Return HTML that sets the session in localStorage and redirects
    const baseUrl = getBaseUrl(request);
    const dashboardUrl = `${baseUrl}/${tokenRecord.role}`;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Extract project ref from Supabase URL for storage key
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    const session = verifyData.session;
    const sessionJson = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    });

    // Return HTML page that sets localStorage and redirects
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Signing in...</title>
</head>
<body>
  <p>Signing in as ${userData.user.email}...</p>
  <script>
    try {
      localStorage.setItem('${storageKey}', '${sessionJson.replace(/'/g, "\\'")}');
      window.location.href = '${dashboardUrl}';
    } catch (e) {
      document.body.innerHTML = '<p>Error: ' + e.message + '</p>';
    }
  </script>
</body>
</html>
`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
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

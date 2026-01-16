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

    // 11. Set session cookies and redirect to dashboard
    const baseUrl = getBaseUrl(request);
    const dashboardUrl = `${baseUrl}/${tokenRecord.role}`;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Extract project ref from Supabase URL for cookie names
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

    const session = verifyData.session;

    // Create redirect response
    const response = NextResponse.redirect(dashboardUrl);

    // Cookie options - match @supabase/ssr defaults
    const cookieOptions = {
      path: "/",
      sameSite: "lax" as const,
      httpOnly: false, // Supabase client needs to read these
      secure: !baseUrl.includes("localhost"),
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Set the auth cookies in the format @supabase/ssr expects
    // Cookie name format: sb-<project-ref>-auth-token
    const baseCookieName = `sb-${projectRef}-auth-token`;

    // Supabase SSR stores session as base64-encoded JSON
    const sessionPayload = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    });

    // Base64 encode the session
    const base64Session = Buffer.from(sessionPayload).toString("base64");

    // Supabase SSR chunks cookies at ~3180 chars to stay under 4KB limit
    const CHUNK_SIZE = 3180;
    const chunks: string[] = [];
    for (let i = 0; i < base64Session.length; i += CHUNK_SIZE) {
      chunks.push(base64Session.slice(i, i + CHUNK_SIZE));
    }

    // Set chunked cookies in the format @supabase/ssr expects
    if (chunks.length === 1) {
      response.cookies.set(baseCookieName, `base64-${chunks[0]}`, cookieOptions);
    } else {
      chunks.forEach((chunk, index) => {
        response.cookies.set(
          `${baseCookieName}.${index}`,
          `base64-${chunk}`,
          cookieOptions
        );
      });
    }

    return response;
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
 * Uses the request's host to stay on the same domain.
 */
function getBaseUrl(request: NextRequest): string {
  // Always use the request's host to stay on the same URL
  // (VERCEL_URL gives the deployment ID URL, not the branch alias)
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

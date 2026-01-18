import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Missing Supabase URL" }, { status: 500 });
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const baseCookieName = `sb-${projectRef}-auth-token`;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host") ?? "";
  const isSecure = forwardedProto === "https" || (!host.includes("localhost") && !host.includes("127.0.0.1"));

  const response = NextResponse.json({ ok: true });
  const cookies = request.cookies.getAll();

  cookies.forEach((cookie) => {
    if (cookie.name === baseCookieName || cookie.name.startsWith(`${baseCookieName}.`)) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: isSecure,
        expires: new Date(0),
      });
    }
  });

  return response;
}

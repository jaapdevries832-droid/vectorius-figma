"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { checkExistingSession } from "@/lib/auth/check-session";
import { getCurrentProfile } from "@/lib/profile";

type AuthMode = "sign-up" | "sign-in";

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

export default function StudentJoinPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { user, profile } = await checkExistingSession();
      if (!isMounted) return;
      if (user) {
        setUserId(user.id);
        setRole(profile?.role ?? null);
      }
      setIsCheckingAuth(false);
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizeCode = (value: string) => value.replace(/\s+/g, "").toUpperCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (normalized.length !== 8) {
      setStatus({ type: "error", message: "Invite codes are 8 characters long." });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    if (role && role !== "student") {
      setStatus({ type: "error", message: "Invite codes are for student accounts only." });
      setIsLoading(false);
      return;
    }

    let activeUserId = userId;
    let activeRole = role;

    if (!activeUserId) {
      if (!password || password.length < 6) {
        setStatus({ type: "error", message: "Password must be at least 6 characters." });
        setIsLoading(false);
        return;
      }

      if (authMode === "sign-up") {
        const signupEmail = email.trim() || `student+${normalized.toLowerCase()}@vectorius.local`;
        const { data, error } = await supabase.auth.signUp({
          email: signupEmail,
          password,
          options: {
            data: {
              role: "student",
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            setAuthMode("sign-in");
            setStatus({ type: "error", message: "Account exists. Switch to sign in." });
          } else {
            setStatus({ type: "error", message: error.message });
          }
          setIsLoading(false);
          return;
        }

        if (!data.session || !data.user) {
          setStatus({
            type: "success",
            message: "Check your email to confirm your account, then return to /join.",
          });
          setIsLoading(false);
          return;
        }

        activeUserId = data.user.id;
        activeRole = "student";
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user) {
          setStatus({ type: "error", message: error?.message ?? "Unable to sign in." });
          setIsLoading(false);
          return;
        }
        activeUserId = data.user.id;
      }

      const { profile } = await getCurrentProfile();
      activeRole = profile?.role ?? activeRole;
      if (activeRole && activeRole !== "student") {
        setStatus({ type: "error", message: "Invite codes are for student accounts only." });
        setIsLoading(false);
        return;
      }

      if (activeUserId) {
        setUserId(activeUserId);
      }
      setRole(activeRole ?? null);
    }

    const { error: acceptError } = await supabase.rpc("accept_student_invite", {
      invite_code_input: normalized,
    });

    if (acceptError) {
      const message = acceptError.message || "Unable to accept invite code.";
      setStatus({ type: "error", message });
      setIsLoading(false);
      return;
    }

    setStatus({ type: "success", message: "Invite accepted. Redirecting to your dashboard..." });
    setTimeout(() => router.push("/student"), 800);
  };

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-background p-6 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Join as a student</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 8-character invite code provided by your parent.
          </p>
        </div>
        {!userId && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => setAuthMode("sign-up")}
              className={`rounded-lg px-3 py-2 ${
                authMode === "sign-up" ? "bg-primary text-white" : "border border-border"
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("sign-in")}
              className={`rounded-lg px-3 py-2 ${
                authMode === "sign-in" ? "bg-primary text-white" : "border border-border"
              }`}
            >
              Sign in
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span>Invite code</span>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center tracking-widest"
              placeholder="ABCDEFGH"
              maxLength={12}
            />
          </label>
          {!userId && (
            <>
              <label className="block space-y-2 text-sm">
                <span>Email {authMode === "sign-up" ? "(optional)" : ""}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={authMode === "sign-up" ? "student@email.com" : "you@email.com"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={
              isLoading ||
              (!userId && password.trim().length < 6) ||
              (!userId && authMode === "sign-in" && email.trim().length === 0)
            }
            className="w-full rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-70"
          >
            {isLoading
              ? "Linking..."
              : userId
                ? "Link my account"
                : authMode === "sign-up"
                  ? "Create account and link"
                  : "Sign in and link"}
          </button>
        </form>
        {!userId && authMode === "sign-up" && (
          <p className="text-xs text-muted-foreground">
            If you skip email, we will create a placeholder address so you can continue.
          </p>
        )}
        {status && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              status.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </main>
  );
}

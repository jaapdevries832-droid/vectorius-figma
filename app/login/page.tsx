"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";

type AuthMode = "sign-in" | "sign-up";
type SignupRole = "" | "parent" | "student" | "advisor";

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<SignupRole>("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already logged in and redirect to their dashboard
  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      // Force a fresh session check by getting the session directly
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) return;

      // If no session, user is not logged in
      if (!session) {
        setIsCheckingAuth(false);
        return;
      }

      // Session exists, get profile to determine role
      const { user, profile } = await getCurrentProfile();

      if (!isMounted) return;

      if (user && profile?.role) {
        // User is already logged in, redirect to their dashboard
        router.push(`/${profile.role}`);
        return;
      }

      setIsCheckingAuth(false);
    };

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      if (mode === "sign-up") {
        if (!signupRole) {
          setStatus({ type: "error", message: "Please choose a role to continue." });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: signupRole,
            },
          },
        });
        if (error) {
          setStatus({ type: "error", message: error.message });
          return;
        }

        if (data.session) {
          router.push(`/${signupRole}`);
        } else {
          setStatus({ type: "success", message: "Check your email to confirm your account." });
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus({ type: "error", message: error.message });
        return;
      }

      const { profile } = await getCurrentProfile();
      const role = profile?.role ?? "parent";

      if (role === "advisor") {
        router.push("/advisor");
      } else if (role === "student") {
        router.push("/student");
      } else {
        router.push("/parent");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in right now.";
      setStatus({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStatus(null);
  };

  // Show loading while checking existing session
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
          <h1 className="text-2xl font-semibold">Parent Access</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "sign-in" ? "Sign in to continue." : "Create a new parent account."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => toggleMode("sign-in")}
            className={`rounded-lg px-3 py-2 text-sm ${
              mode === "sign-in" ? "bg-primary text-white" : "border border-border"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => toggleMode("sign-up")}
            className={`rounded-lg px-3 py-2 text-sm ${
              mode === "sign-up" ? "bg-primary text-white" : "border border-border"
            }`}
          >
            Sign Up
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/join"
            className="block rounded-lg border border-border px-3 py-2 text-center text-sm"
          >
            Student invite code
          </Link>
          <Link
            href="/join/parent"
            className="block rounded-lg border border-border px-3 py-2 text-center text-sm"
          >
            Parent invite code
          </Link>
        </div>
        {mode === "sign-up" && (
          <fieldset className="space-y-2 text-sm">
            <legend className="text-sm font-medium">Choose your role</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["parent", "student", "advisor"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSignupRole(role)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                    signupRole === role ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-70"
          >
            {isLoading ? "Working..." : mode === "sign-in" ? "Sign In" : "Sign Up"}
          </button>
        </form>
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

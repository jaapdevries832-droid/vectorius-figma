"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoParentPrefill = () => {
    setEmail("test@email.com");
    setPassword("123456");
    setStatus(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setStatus({ type: "error", message: error.message });
      } else {
        setStatus({ type: "success", message: "Check your email to confirm your account." });
      }
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus({ type: "error", message: error.message });
      setIsLoading(false);
      return;
    }

    router.push("/parent");
  };

  const toggleMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStatus(null);
  };

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
        <button
          type="button"
          onClick={handleDemoParentPrefill}
          className="w-full rounded-lg border-2 border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
        >
          Demo Parent Login (Prefill)
        </button>
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

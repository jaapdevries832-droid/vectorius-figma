"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

export default function StudentJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { user, profile } = await getCurrentProfile();
      if (!isMounted) return;
      if (!user) {
        setStatus({ type: "error", message: "Please sign in to use an invite code." });
        setIsCheckingAuth(false);
        return;
      }
      setUserId(user.id);
      setRole(profile?.role ?? null);
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
    if (!userId) return;

    if (role && role !== "student") {
      setStatus({ type: "error", message: "Invite codes are for student accounts only." });
      return;
    }

    const normalized = normalizeCode(code);
    if (normalized.length !== 8) {
      setStatus({ type: "error", message: "Invite codes are 8 characters long." });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    const { data: invite, error: inviteError } = await supabase
      .from("student_invites")
      .select("id, student_id, expires_at, accepted_at")
      .ilike("invite_code", normalized)
      .single();

    if (inviteError || !invite) {
      setStatus({ type: "error", message: inviteError?.message ?? "Invite code not found." });
      setIsLoading(false);
      return;
    }

    if (invite.accepted_at) {
      setStatus({ type: "error", message: "This invite code has already been used." });
      setIsLoading(false);
      return;
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      setStatus({ type: "error", message: "This invite code has expired." });
      setIsLoading(false);
      return;
    }

    const { error: inviteUpdateError } = await supabase
      .from("student_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      setStatus({ type: "error", message: inviteUpdateError.message });
      setIsLoading(false);
      return;
    }

    const { error: studentUpdateError } = await supabase
      .from("students")
      .update({ student_user_id: userId })
      .eq("id", invite.student_id)
      .is("student_user_id", null);

    if (studentUpdateError) {
      setStatus({ type: "error", message: studentUpdateError.message });
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
          <button
            type="submit"
            disabled={isLoading || !userId}
            className="w-full rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-70"
          >
            {isLoading ? "Linking..." : "Link my account"}
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

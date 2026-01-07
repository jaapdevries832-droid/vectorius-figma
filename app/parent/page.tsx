"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ParentDashboard } from "@/components/ParentDashboard";

export default function ParentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayNameStatus, setDisplayNameStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? "Unknown");
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", data.user.id)
        .single();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      }

      setIsLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleDisplayNameSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    setDisplayNameStatus(null);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId);

    if (error) {
      setDisplayNameStatus({ type: "error", message: error.message });
    } else {
      setDisplayNameStatus({ type: "success", message: "Display name saved." });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">Signed in as {email}</p>
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="display-name" className="text-sm font-medium text-gray-700">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Your name"
              />
            </div>
            <button
              type="button"
              onClick={handleDisplayNameSave}
              disabled={isSaving}
              className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
          {displayNameStatus && (
            <p
              className={`mt-3 text-xs ${
                displayNameStatus.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {displayNameStatus.message}
            </p>
          )}
        </div>
      </div>
      <ParentDashboard onSignOut={handleSignOut} />
    </main>
  );
}

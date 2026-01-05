"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ParentDashboard } from "@/components/ParentDashboard";

export default function ParentPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
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

  if (isLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <p className="text-sm text-muted-foreground">Signed in as {email}</p>
      </div>
      <ParentDashboard onSignOut={handleSignOut} />
    </main>
  );
}

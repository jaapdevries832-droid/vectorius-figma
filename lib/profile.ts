import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/src/types/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

export async function getCurrentProfile(): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, profile: null };
  }

  const user = data.user;
  const { data: profile, error: profileError, status } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && status !== 406) {
    throw profileError;
  }

  return { user, profile: (profile as Profile | null) ?? null };
}

export async function requireProfile(): Promise<{ user: User; profile: Profile }> {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!profile) {
    throw new Error("Profile missing");
  }

  return { user, profile };
}

export async function requireRole(
  allowedRoles: readonly AppRole[],
): Promise<{ user: User; profile: Profile }> {
  const { user, profile } = await requireProfile();

  if (!allowedRoles.includes(profile.role as AppRole)) {
    throw new Error("Forbidden");
  }

  return { user, profile };
}


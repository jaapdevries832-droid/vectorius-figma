import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";
import type { Database } from "@/src/types/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type RouterLike = {
  push: (href: string) => void;
};

type CheckExistingSessionOptions = {
  router?: RouterLike;
  redirectIfAuthenticated?: boolean;
};

type CheckExistingSessionResult = {
  user: User | null;
  profile: Profile | null;
  redirected: boolean;
};

export async function checkExistingSession(
  options: CheckExistingSessionOptions = {},
): Promise<CheckExistingSessionResult> {
  const { router, redirectIfAuthenticated = false } = options;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { user: null, profile: null, redirected: false };
  }

  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) {
    return { user: null, profile: null, redirected: false };
  }

  if (redirectIfAuthenticated && router) {
    router.push(`/${profile.role}`);
    return { user, profile, redirected: true };
  }

  return { user, profile, redirected: false };
}

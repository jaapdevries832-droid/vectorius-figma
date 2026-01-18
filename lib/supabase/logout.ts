const SUPABASE_STORAGE_KEY_REGEX = /^sb-.*-auth-token(\.|$)/;

export function clearSupabaseLocalSession() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage).forEach((key) => {
      if (
        SUPABASE_STORAGE_KEY_REGEX.test(key) ||
        key === "supabase.auth.token" ||
        key.endsWith("-auth-token-code-verifier")
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Best-effort cleanup only.
  }
}

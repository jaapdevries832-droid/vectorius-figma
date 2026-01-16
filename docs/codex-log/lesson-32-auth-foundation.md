# Lesson 32 — Auth foundation (roles + profiles)

## Goal
- Add `public.app_role` enum and ensure `public.profiles` has updated_at trigger + RLS policies.
- Add app helper functions to read current user profile and handle missing profiles.

## Commands run
- `git status`
- `git restore docs/codex-rules.md`
- `supabase migration new profiles_and_roles`
- `supabase db push --yes`
- `supabase db pull` (returned non-zero with “No schema changes found”)
- `supabase gen types typescript --linked --schema public --schema graphql_public | Set-Content -Encoding utf8 src/types/supabase.ts`
- `npm run lint`
- `npm run build`

## Notes
- Remote already had an existing `public.profiles` table keyed by `id`, so the Lesson 32 migration was adapted to be compatible (no rename of the existing PK).
- Types generation initially produced a binary-encoded file via PowerShell redirection; regenerated as UTF-8 to satisfy ESLint.


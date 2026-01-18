# Slice Runner (Vectorius) -- Standard Process

Purpose: run one vertical slice end-to-end with minimal supervision, keeping UI stable and migrations clean.

## Inputs
- Slice definition lives in `docs/projects/prd-pivot-plan.md` under "10-Slice Implementation Plan".
- The agent run must target exactly ONE slice per execution.

## Non-negotiable rules
- No UI redesign. Keep layouts/styling intact; minimal UI tweaks are allowed only when required to meet slice acceptance criteria.
- No broad refactors/renames/cleanup/format-only diffs.
- All DB changes are new SQL migrations in `/supabase/migrations`. Never edit existing migrations. Fix-forward only.
- Forbidden unless explicitly requested: `supabase db reset`, `supabase migration repair`, destructive deletes, commands that could expose secrets.

## Standard execution steps (always)
1) **Read-only discovery**
   - Confirm current branch and clean/dirty state (`git status`).
   - Open `docs/projects/prd-pivot-plan.md` and extract the exact scope for the selected slice:
     - files to touch
     - hardcoded sources to replace
     - proposed DB objects
   - Inspect existing migrations/schema patterns; reuse naming conventions where possible.

2) **Implementation (slice-only)**
   - Create the minimum schema required (tables first; avoid views unless underlying tables are confirmed to exist).
   - Enable RLS and implement least-privilege policies sufficient for the slice.
   - Wire the UI to Supabase for that slice (read + write flows as required), keeping UI identical.

3) **Verification**
   - If schema changed: `supabase db push`, `supabase db pull`, `supabase migration list`.
   - Run `npm run lint` and `npm run build` (and tests if present).
   - Fix failures before committing.

4) **Mark slice status in plan**
   - Update `docs/projects/prd-pivot-plan.md` by marking the slice as complete (or blocked) with:
     - date
     - commit SHA
     - brief notes (schema objects created, key UI files updated)
     - manual test path
     - If a slice has a commit SHA and a completed manual test path, its status MUST be set to complete.

5) **Commit & push (one commit per slice)**
   - Stage only relevant files (migrations, touched code, plan doc + any slice docs).
   - Commit message: `slice N: <short description> real data`
   - `git push`

### Commit ordering rule

A slice may require two commits:
1) A code/schema commit implementing the slice.
2) A documentation-only commit that records the slice commit SHA in
   `docs/projects/prd-pivot-plan.md`.

Both commits together constitute a completed slice.

Commit amendment is NOT required and should not be assumed.

## Stop conditions (only hard blockers)
Stop only if:
- missing required env var / config
- Supabase command fails in a way that requires high-risk repair
- schema mismatch prevents progress
When stopping, output exact error, commands run, files changed, and smallest next action.

### Tracker status normalization (required)

When updating the Slice Status Tracker in `docs/projects/prd-pivot-plan.md`:

- Status MUST match the legend in the plan.
- If the slice has:
  - a slice implementation commit SHA, AND
  - lint/build passed (when required), AND
  - a manual test path,
  then Status MUST be set to complete.
- If blocked, set Status to blocked and briefly explain the blocker in Notes.

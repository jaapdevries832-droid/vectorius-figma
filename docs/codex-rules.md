# Codex Guardrails (Vectorius)

This file defines **non-negotiable rules** for AI-assisted changes (Codex / Copilot / agents).
Goal: keep database + git history clean, prevent silent breakage, and make work repeatable.

---

## 0) Prime Directive

**Do not be clever. Be correct.**
If anything is unclear, stop and ask instead of guessing.

---

## 1) Branch Safety (MUST DO FIRST)

Before making *any* changes or running migrations:

1. Run:
   - `git status`
2. Confirm:
   - You are on the branch the user requested (e.g., `lesson-29`)
   - Working tree is clean (or user explicitly agrees to proceed with existing changes)

If branch is wrong:
- **STOP**
- Tell the user the current branch name
- Ask whether to switch or create a new branch
- Do **not** continue until branch is corrected

Codex must not rename branches unless explicitly instructed.

---

## 2) Supabase Schema Rules (Source of Truth)

**All schema changes must be SQL migrations in:**
- `/supabase/migrations`

Hard rules:
- **Never edit an existing migration file** (anything already created/committed/applied).
- If a migration was wrong or empty:
  - Create a **new** migration that fixes forward.
- Supabase UI is for **inspection only**, not the source of truth.

---

## 3) Required Supabase Workflow

For any schema change:

1. Create a new migration:
   - `supabase migration new <name>`
2. Edit **only** the newly created migration file.
3. Apply changes to remote:
   - `supabase db push`
4. Sync local schema artifacts:
   - `supabase db pull`
5. Verify history:
   - `supabase migration list`

If a CLI step fails:
- **STOP** and report the error + command output.
- Do not “make it pass” with unsafe commands.

---

## 4) Forbidden / High-Risk Commands (Do NOT run)

Do not run these unless the user explicitly asks:

- `supabase migration repair ...`
- `supabase db reset` (data-destructive)
- `supabase db dump` (may expose sensitive data)
- Any Docker prune/delete commands
- Any commands that remove files broadly (e.g., `rm -rf`, `del /s`, etc.)

If migration history is inconsistent:
- Prefer fix-forward via new migration.
- Escalate to the user with a clear explanation.

---

## 5) Handling `supabase db pull` Quirks

If `supabase db pull` prints **"No schema changes found"** but exits non-zero:
- Treat it as a *likely CLI bug*.
- Confirm there were no repo file changes:
  - `git status`
- Continue only if working tree remains unchanged and user approves.

If `port 54320 already allocated`:
- Stop and recommend:
  - `supabase stop --project-id <id>` (or `supabase stop`)
  - confirm port free (Windows): `netstat -ano | findstr :54320`
  - Say something like, Port 54320 is in use, which Supabase needs for the shadow database.
I recommend running supabase stop --project-id vectorius-figma to free it.
This will stop local Supabase containers for this project.
Shall I proceed?
- Retry `supabase db pull` after the port is freed.

---

## 6) Minimalism in App Changes

When adding app changes to prove a migration:
- Keep changes localized to the smallest surface area.
- Avoid refactoring unrelated code.
- Avoid large formatting-only changes.
- Prefer adding small, explicit `select(...)` fields (do not rely on `select("*")` if types are strict).

---

## 7) Pre-Commit Checklist (Codex must do)

Before staging:
1. Show:
   - `git diff` (or summary if large)
2. Confirm:
   - Only intended files changed
   - No secrets added (`.env*`, keys, tokens, service role keys)

Staging rules:
- Stage only the files relevant to the change:
  - the new migration file(s)
  - the specific app file(s)
  - documentation updates if needed

Commit rules:
- Commit migration + app changes together when they’re logically connected.
- Use a descriptive commit message:
  - `Lesson XX: <what changed>`

Push rules:
- After commit:
  - `git push`
- Then show:
  - `git status`

---

## 8) Output Requirements (Codex response format)

At the end of a task, Codex must report:

- Current branch name (from `git status`)
- Commands executed (in order)
- Files changed (list)
- Migration filename(s) created
- Confirmation that old migrations were not edited
- Lint/build results if run

---

## 9) If Uncertain, Stop

Stop and ask the user if:
- You’re not sure which branch to use
- You can’t verify which migration file is “new”
- You see unexpected file changes
- A command fails and you’re tempted to “repair” history

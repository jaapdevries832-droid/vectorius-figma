# Codex Guardrails (Vectorius)

## AUTHORITY
This file is the default authority for AI-assisted changes in this repo (Codex / agents / Copilot).
If this file conflicts with other instructions, this file wins unless the user explicitly overrides it in the prompt.

Goal: keep database + git history clean, prevent silent breakage, and make work repeatable.

When to apply: Follow these rules for any task in this repo that involves code, schema, workflow, or configuration changes. If a user prompt adds stricter rules, those override and must be followed.

---

## 0) Prime Directive
Do not be clever. Be correct. If anything is unclear, stop and ask instead of guessing.

---

## 1) Mandatory Before Coding (Acknowledge)
Before making any changes, the agent must:

1. Run `git status`
2. Confirm current branch name AND confirm working tree is clean (or user explicitly approves proceeding dirty)
3. Restate the objective in 1–2 sentences
4. List 3–6 rules it will follow for this task
5. Declare what it will NOT do (e.g., “no UI redesign”, “no schema edits outside migrations”)
6. Only then proceed

If the branch is wrong:
- STOP
- Report the current branch
- Ask whether to switch/create a branch
- Do not continue until branch is corrected

---

## 2) Scope Contract (Prevents “agent sprawl”)
Every task must have an explicit scope before coding:

- What features are being implemented (1–3 bullets)
- What files/areas are expected to change (e.g., `app/login/page.tsx`, `supabase/migrations/*`)
- What is explicitly out of scope (e.g., redesigns, refactors, renaming folders)

Hard rule:
- Avoid “cleanup”, “refactor”, “restructure”, “rename”, “format-only” changes unless the user explicitly asked.

If the request is broad (e.g., “connect everything to DB”), the agent must propose a plan of *vertical slices* and proceed with only the first slice unless the user explicitly authorizes multiple slices.

---

## 3) No Assumptions Rule
Do not assume:
- table names
- column semantics
- existing constraints/policies/triggers
- desired UX behavior
- which route should exist (e.g., `/student`) or what roles exist

If not explicitly stated or visible in code or schema, stop and ask.

---

## 4) Supabase Schema Rules (Source of Truth)
All schema changes must be SQL migrations in:

`/supabase/migrations`

Hard rules:
- Never edit an existing migration file (anything already created/committed/applied).
- If something needs changing, fix-forward via a new migration.
- Supabase UI is for inspection/verification only, not the source of truth.
- Do not use `supabase db reset` unless the user explicitly asks (data-destructive).
- If a migration version exists in the remote history, keep the matching local file.
- Do not delete `remote_schema` migrations unless you also run a user-approved `supabase migration repair`.

Allowed DB changes include:
- tables, columns, indexes, constraints
- RLS enablement + policies
- functions/triggers (via fix-forward migrations)

---

## 5) Required Supabase Workflow (for any schema change)
For any schema change:

1. `supabase migration new <name>`
2. Edit only the newly created migration file
3. `supabase db push`
4. `supabase db pull`
5. `supabase migration list`

If a CLI step fails:
- STOP and report the error + the exact command output
- Do not “make it pass” with unsafe commands
- Only continue if the user approves a safe workaround

---

## 6) Forbidden / High-Risk Commands (Do NOT run)
Do not run these unless the user explicitly asks:

- `supabase migration repair ...`
- `supabase db reset` (data-destructive)
- `supabase db dump` (may expose sensitive data)
- Docker prune/delete commands
- Broad delete commands (e.g., `rm -rf`, `del /s`, removing folders wholesale)
- Any command likely to expose secrets, tokens, or private data

If migration history is inconsistent:
- Prefer fix-forward via a new migration
- Escalate to the user with a clear explanation

---

## 7) Handling `supabase db pull` Quirks
If `supabase db pull` prints “No schema changes found” but exits non-zero:

-Exception: supabase db pull non-zero but no-op

If supabase db pull prints “No schema changes found”

AND git status shows no new migrations (or only the intended new migration)

AND supabase migration list shows local/remote are in sync
 Then treat it as a non-blocking warning and continue.

If port 54320 is already allocated:
- STOP and recommend freeing it (e.g., `supabase stop`)
- Explain that Supabase needs this port for the shadow database
- Proceed only after user approval

---

## 8) Minimalism in App Changes
When adding app changes to support/validate schema:

- Keep changes localized to the smallest surface area.
- Avoid refactoring unrelated code.
- Avoid large formatting-only diffs.
- Prefer explicit `select(...)` fields (avoid `select("*")` if types are strict).
- Do not change visual layouts unless explicitly requested.

If changes spread beyond the stated scope:
- STOP and ask for approval before continuing.

---

## 9) Definition of Done (DoD) + Verification
Every task must declare a DoD before coding and verify it after.

Typical DoD items:
- Feature works end-to-end (UI ↔ DB ↔ RLS)
- Correct error handling for expected failures (duplicates, permission denied)
- RLS prevents cross-user leakage
- Lint/build pass when requested or when changes are significant

Verification rules:
- If the task touches routing/auth, verify behavior for each role affected.
- If the task touches DB/RLS, validate with at least one SQL check or real UI test path.
- If lint/build is required by prompt or the change is non-trivial, run:
  - `npm run lint`
  - `npm run build`

---

## 10) Pre-Commit Checklist (Agent must do)
Before staging:

- Show `git diff` (or a summary if large)
- Confirm:
  - Only intended files changed
  - No secrets added (`.env*`, keys, tokens, service role keys)
  - No old migrations edited
- Stage only relevant files:
  - new migration(s)
  - specific app file(s)
  - docs updates if needed

Commit rules:
- Commit schema + app changes together when they’re logically connected.
- Use a descriptive commit message the user requested; otherwise:
  - `Lesson XX: <what changed>` or `<area>: <what changed>`

Push rules:
- After commit: `git push`
- Then show: `git status`

---

## 11) Output Requirements (Agent response format)
At the end of a task, the agent must report:

- Current branch name (from `git status`)
- Commands executed (in order)
- Files changed (list)
- Migration filename(s) created (if any)
- Confirmation that old migrations were not edited
- Lint/build results if run

---

## 12) If Uncertain, Stop
Stop and ask the user if:

- Unsure which branch to use
- Unsure which migration file is “new”
- Unexpected file changes appear
- A command fails and you’re tempted to “repair” history
- You need to expand scope beyond the contract

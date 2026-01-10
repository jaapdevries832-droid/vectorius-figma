# Codex Guardrails (Vectorius) -- STRICT

## AUTHORITY
This file is the default authority for AI-assisted changes in this repo (Codex / agents / Copilot).
If this file conflicts with other instructions, this file wins unless the user explicitly overrides it in the prompt.

Goal: keep database + git history clean, prevent silent breakage, and make work repeatable.

When to apply: Follow these rules for any task in this repo that involves code, schema, workflow, or configuration changes. If a user prompt adds stricter rules, those override and must be followed.

---

## 0) Prime Directive
Do not be clever. Be correct. If anything is unclear, STOP and ask instead of guessing.

---

## 1) Mandatory Before Coding (Acknowledge)
Before making any changes, the agent must:

1. Run `git status`
2. Confirm current branch name AND confirm working tree is clean (or user explicitly approves proceeding dirty)
3. Restate the objective in 1--2 sentences
4. List 3--6 rules it will follow for this task
5. Declare what it will NOT do (e.g., "no UI redesign", "no schema edits outside migrations")
6. Only then proceed

If the branch is wrong:
- STOP
- Report the current branch
- Ask whether to switch/create a branch
- Do not continue until branch is corrected

---

## 2) Scope Contract (Prevents "agent sprawl")
Every task must have an explicit scope before coding:
- What features are being implemented (1--3 bullets)
- What files/areas are expected to change (examples: `app/**`, `components/**`, `supabase/migrations/*`)
- What is explicitly out of scope (redesigns, refactors, renaming folders, formatting-only changes)

Hard rule:
- Avoid "cleanup", "refactor", "restructure", "rename", "format-only" changes unless the user explicitly asked.

If the request is broad (e.g., "connect everything to DB"), the agent must propose a plan of vertical slices and proceed with ONLY the first slice unless the user explicitly authorizes multiple slices.

---

## 3) No Assumptions Rule
Do not assume:
- table names
- column semantics
- existing constraints/policies/triggers
- desired UX behavior
- which routes should exist or what roles exist

If not explicitly stated or visible in code or schema, STOP and ask.

---

## 4) Supabase Schema Rules (Source of Truth)
All schema changes must be SQL migrations in:
`/supabase/migrations`

Hard rules:
- Never edit an existing migration file (anything already created/committed/applied).
- Fix-forward only via a new migration.
- Supabase UI is for inspection/verification only, not the source of truth.
- Do not use `supabase db reset` unless the user explicitly asks (data-destructive).
- Do not delete any `remote_schema` migrations unless the user explicitly approves a `supabase migration repair` plan.

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
- STOP and report the error + exact command output
- Do not run high-risk commands to "make it pass"
- Only continue if the user approves a safe workaround

---

## 6) Forbidden / High-Risk Commands (Do NOT run)
Do not run these unless the user explicitly asks:

- `supabase migration repair ...`
- `supabase db reset`
- `supabase db dump`
- Docker prune/delete commands
- Broad delete commands (e.g., `rm -rf`, `del /s`, removing folders wholesale)
- Any command likely to expose secrets or private data

If migration history is inconsistent:
- Prefer fix-forward via a new migration
- Escalate to the user with a clear explanation

---

## 7) Handling `supabase db pull` Quirks
If `supabase db pull` prints "No schema changes found" but exits non-zero:

Treat it as non-blocking ONLY if ALL are true:
- Output indicates no schema changes
- `git status` shows no unexpected new migrations
- `supabase migration list` indicates local/remote are in sync

If port 54320 is already allocated:
- STOP and recommend freeing it (e.g., `supabase stop`)
- Proceed only after user approval

---

## 8) Minimalism in App Changes
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

Verification rules:
- If routing/auth touched, verify each role affected.
- If DB/RLS touched, validate with at least one SQL check or real UI test path.
- For non-trivial changes, run:
  - `npm run lint`
  - `npm run build`

---

## 10) Pre-Commit Checklist
Before staging:
- Show `git diff` (or summary if large)
- Confirm:
  - Only intended files changed
  - No secrets added (`.env*`, keys, tokens, service role keys)
  - No old migrations edited
- Stage only relevant files

Commit rules:
- Commit schema + app changes together when logically connected.
- Use descriptive commit message:
  - `Lesson XX: <what changed>` or `<area>: <what changed>`

Push rules:
- After commit: `git push`
- Then show: `git status`

---

## 11) Output Requirements (Agent response format)
At the end of a task, report:
- Branch name (from `git status`)
- Commands executed (in order)
- Files changed
- Migration filename(s) created
- Confirmation old migrations were not edited
- Lint/build results

---

## 12) If Uncertain, Stop
Stop and ask if:
- Unsure which branch to use
- Unsure which migration file is "new"
- Unexpected file changes appear
- A command fails and you're tempted to "repair" history
- Scope must expand beyond contract

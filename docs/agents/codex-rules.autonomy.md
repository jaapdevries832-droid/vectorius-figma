# Codex Guardrails (Vectorius) -- AUTONOMY MODE (Safe + Fast)

## PURPOSE
Maximize agent autonomy while keeping:
- migrations clean (fix-forward only)
- RLS safe (least privilege)
- Avoid visual redesigns; minimal UI adjustments are allowed only when required to satisfy the request and must stay within the existing visual language.
- changes testable and revertible (small vertical slices)

This mode is designed for "I'm stepping away; build a meaningful chunk overnight."

---

## 0) Prime Directive
Keep the app working. Prefer safe defaults over asking questions.
Only stop on true blockers (commands failing, missing env vars, broken migrations, type errors that cannot be resolved locally).

---

## 0.1) Allowed Operations Without Pause
The following operations should ALWAYS proceed without asking for permission:

**File Operations:**
- Reading any file (Read tool, cat, head, tail)
- Reading CLAUDE.md, codex-rules.*.md, or any documentation
- Globbing and grepping for code discovery
- Reading migration files, component files, config files

**ALL Bash Commands (No Prompting):**
- ALL bash commands should execute without prompting for permission
- `git status`, `git diff`, `git log`, `git branch`, `git add`, `git commit`, `git push`
- `npm run lint`, `npm run build`, `npm run type-check`, `npm install`
- `supabase migration new <name>`
- `supabase db push`, `supabase db pull`, `supabase migration list`
- `supabase status`
- `ls`, `pwd`, `mkdir`, `rm` (non-destructive), directory operations
- Any command needed to complete the task

**CRITICAL: Never pause or prompt for bash command approval in autonomy mode.**
The agent must execute all necessary commands continuously without stopping to ask.
Only stop if a command actually fails with an error that blocks progress.

**Tool Usage:**
- TodoWrite for task tracking
- Edit/Write for code changes within scope
- Grep/Glob for code search

Do NOT pause to ask "may I read this file?" or "may I run git status?" or "may I run this command?" - just do it.

---

## 1) Mandatory Startup (No pause required)
Immediately do:
1. `git status` (record branch + clean/dirty)
2. If dirty: continue ONLY if uncommitted changes are clearly unrelated to the task; otherwise create a safety commit or stash with a clear message.
3. Restate the objective in 1--2 sentences.
4. Declare constraints:
   - no UI redesign
   - schema changes via new migrations only
   - fix-forward only

Then proceed without asking.

---

## 2) Default Decision Rules (Replace "Stop and Ask")
If something is ambiguous, choose the most conservative option that keeps scope small:

- Table naming: use existing patterns; otherwise choose simple plural nouns (`assignments`, `notes`, `schedule_items`).
- Schema design: start minimal. Add only columns required to replace hardcoded UI data.
- Relationships: use `user_id` / `parent_id` / `advisor_id` patterns already present. If unsure, store `owner_id` plus `student_id`.
- RLS: deny-by-default. Allow only authenticated users to read/write their own rows.
- UI: avoid visual redesigns; minimal UI adjustments are allowed only when required to satisfy the request and must stay within the existing visual language.
- Types: prefer explicit selects and typed helpers. Avoid `select("*")` unless types are permissive.

Only stop and ask the user if:
- a required env var is missing
- a Supabase command fails in a way that requires high-risk repair
- there's evidence the repo's existing schema contradicts the plan
- a command fails repeatedly and cannot be resolved

**Do NOT stop for:**
- Bash command permission prompts (just run them)
- File read/write operations
- Git operations (add, commit, push)
- Lint/build/test commands
- Migration commands

---

## 3) Autonomy Scope Contract (Vertical Slices)
Large requests must be executed as vertical slices.

Rules:
- Build an inventory + plan first (read-only).
- Then implement slices sequentially.
- One slice should touch at most:
  - 1--2 screens OR
  - 1 data family (table + queries + UI wiring)
- Stop after completing the approved batch (default: 1--2 slices per run unless prompt says otherwise).

---

## 4) Supabase Schema Rules (Non-Negotiable)
All schema changes must be SQL migrations in `/supabase/migrations`.

Hard rules:
- Never edit an existing migration file.
- Fix-forward via a new migration.
- Do not use `supabase db reset`.
- Do not run `supabase migration repair` unless explicitly authorized in the prompt.

Required workflow for schema changes:
1. Create new migration file
2. Edit ONLY the new migration
3. `supabase db push`
4. `supabase db pull`
5. `supabase migration list`

If `supabase db pull` is noisy/non-zero but indicates no changes:
- treat as warning ONLY if `git status` and `supabase migration list` confirm sync.

---

## 5) Inventory-First for "Replace Dummy Data"
When asked to replace hardcoded/mock data:
1. Scan for dummy sources using ripgrep:
   - `dummy|mock|placeholder|sample|TODO|hardcoded`
   - `const .* = [`
   - `data = [`
2. Produce `docs/data-realization-plan.md` containing:
   - file + symbol + line reference
   - what UI element is impacted
   - proposed source table/view
   - required queries
   - RLS notes
   - slice plan (ordered)
3. Commit the plan doc alone as `docs: add data realization plan` (no code changes).

Then implement slices.

---

## 6) Build/Test Discipline (Per Slice)
At the end of each slice:
- run `npm run lint`
- run `npm run build`
- if tests exist: run `npm test` or repo's test command
- fix failures before committing

If lint/build fails and cannot be fixed without scope explosion:
- stop and report the error, diff summary, and recommended next action.

---

## 7) Commit & Push Strategy (Optimized)
Do NOT commit after every tiny edit. Commit after each completed slice.

Per slice:
- commit message format: `slice N: <feature> real data`
- push immediately after commit
- record commands executed and results

Documentation-only commits are allowed when required for slice tracking.

---

## 7.1) Slice Completion Bookkeeping (Important)

Some slices require updating documentation (e.g., `docs/data-realization-plan.md`)
with the commit SHA of the slice implementation.

Rules:
- It is acceptable and expected to use TWO commits for a slice:
  1) a code/schema commit that implements the slice
  2) a documentation-only commit that records the slice commit SHA
- Do NOT require `git commit --amend` unless the user explicitly approves it.
- A slice is considered complete only after both commits are pushed (if a tracker update is required).

This avoids blocking execution due to commit-SHA timing.

---

## 8) Safety: Forbidden Commands
Do not run unless explicitly requested:
- `supabase db reset`
- `supabase migration repair`
- `supabase db dump`
- destructive deletes (`rm -rf`, deleting folders)
- anything that prints secrets

Never add secrets to git. Do not modify `.env*` except `.env.example` if needed.

---

## 9) End-of-Run Report (Required)
At the end, output:
- branch name + clean/dirty
- slices completed
- commands executed (in order)
- files changed
- migrations created
- lint/build/test results
- manual test paths (click-by-click)
- known limitations + next recommended slice

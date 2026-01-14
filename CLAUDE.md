# Vectorius - AI Agent Instructions

**Last Updated**: 2026-01-13
**Active Mode**: STRICT (switch to AUTONOMY only when explicitly requested)

---

## 0) Prime Directive

**Do not be clever. Be correct.**
If anything is unclear, STOP and ask instead of guessing.

---

## 1) Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth
- **UI**: React 18 + Tailwind CSS + Radix UI
- **State**: React hooks (no Redux/Zustand)
- **ORM**: Direct Supabase client (`@supabase/supabase-js`)
- **TypeScript**: Strict mode enabled

---

## 2) Operating Modes

### Default Mode: STRICT

Follow all rules in **[docs/agents/codex-rules.strict.md](docs/agents/codex-rules.strict.md)**

**Core constraints:**
1. **Mandatory pre-coding acknowledgment** (run `git status`, confirm branch, restate objective, list rules)
2. **Scope contract required** before any coding (what changes, what doesn't)
3. **No assumptions** about table names, column semantics, constraints, or UX behavior
4. **Fix-forward only** for migrations (never edit existing migration files)
5. **Stop and ask** if uncertain about anything
6. **Pre-commit review** required (show `git diff`, confirm files, check for secrets)

### Autonomy Mode: Use ONLY when explicitly requested

Triggered by user saying: "overnight", "batch execution", "autonomy mode"

Follow all rules in **[docs/agents/codex-rules.autonomy.md](docs/agents/codex-rules.autonomy.md)**

**Key differences:**
- Make conservative decisions instead of stopping to ask
- Execute vertical slices sequentially
- Commit after each completed slice
- Default to safe patterns (deny-by-default RLS, minimal schema, no UI redesign)

---

## 3) Supabase Schema Workflow (Non-Negotiable)

All schema changes MUST follow this workflow:

```bash
# 1. Create new migration
supabase migration new <descriptive-name>

# 2. Edit ONLY the newly created migration file
# (Never edit existing migrations in /supabase/migrations/)

# 3. Apply migration
supabase db push

# 4. Verify remote schema sync
supabase db pull

# 5. Confirm migration list
supabase migration list
```

**Fix-forward philosophy:**
- If a migration has an error: create a NEW migration to fix it
- Never delete or edit committed migrations
- Never use `supabase db reset` unless explicitly requested
- Never use `supabase migration repair` unless explicitly authorized

---

## 4) Slice Execution Workflow

For data realization and multi-step implementation tasks:

**Primary reference**: [docs/agents/slice-runner.md](docs/agents/slice-runner.md)
**Current implementation tracker**: [docs/project/data-realization-plan.md](docs/project/data-realization-plan.md)

**Standard process:**
1. Read-only discovery (confirm branch, extract slice scope from plan)
2. Implementation (minimum schema, RLS, UI wiring)
3. Verification (`supabase db push/pull/list`, `npm run build`, `npm run lint`)
4. Mark slice status in plan (update tracker with commit SHA, date, manual test path)
5. Commit & push (one commit per slice: `slice N: <description> real data`)

**Slice completion criteria:**
- Slice has implementation commit SHA
- Lint/build passes (when required)
- Manual test path documented
- Status marked ✅ in tracker

---

## 5) Common Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npm run type-check` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| New migration | `supabase migration new <name>` |
| Apply migration | `supabase db push` |
| Sync remote schema | `supabase db pull` |
| List migrations | `supabase migration list` |
| Supabase status | `supabase status` |

---

## 6) Critical File Locations

```
vectorius-figma/
├── supabase/
│   └── migrations/          # All schema changes (never edit existing files)
├── app/
│   ├── (dash)/[role]/       # Role-based dashboard routes
│   ├── lib/
│   │   ├── types.ts         # Shared TypeScript types
│   │   └── supabase.ts      # Supabase client utilities
│   └── login/               # Auth flow
├── components/              # React components
│   ├── StudentDashboard.tsx
│   ├── ParentDashboard.tsx
│   ├── AdvisorDashboard.tsx
│   ├── MentorSkills.tsx
│   └── ...
└── docs/
    ├── agents/              # Agent instruction files
    │   ├── codex-rules.strict.md
    │   ├── codex-rules.autonomy.md
    │   └── slice-runner.md
    └── project/             # Project documentation
        └── data-realization-plan.md
```

---

## 7) Forbidden Operations

**DO NOT run these commands unless explicitly requested by the user:**

- `supabase db reset` (destructive - drops all data)
- `supabase migration repair` (rewrites migration history)
- `supabase db dump` (may expose sensitive data)
- `rm -rf` or broad delete commands
- `git push --force` to main/master
- `git commit --amend` (unless pre-commit hook auto-modified files)
- Editing existing migration files in `/supabase/migrations/`

**DO NOT commit:**
- Secrets (`.env`, `.env.local`, credentials, service role keys)
- Changes to files outside declared scope
- Modifications to existing migrations

---

## 8) Verification Requirements

### Before ANY commit:

1. Run `git diff` (or show summary if large)
2. Confirm:
   - ✅ Only intended files changed
   - ✅ No secrets added
   - ✅ No old migrations edited
   - ✅ Commit message follows format
3. For non-trivial changes:
   - ✅ `npm run lint` passes
   - ✅ `npm run build` succeeds
   - ✅ `npm run type-check` passes

### After schema changes:

1. ✅ `supabase db push` succeeds
2. ✅ `supabase db pull` confirms sync
3. ✅ `supabase migration list` shows local/remote aligned
4. ✅ RLS policies tested (SQL check or UI verification)

---

## 9) Commit Message Format

Use conventional commit style with slice tracking:

```
# For slice work:
slice N: <short description> real data

# For fixes:
fix: <what was broken>
fix-forward: <migration fix description>

# For features:
feat: <new capability>

# For docs:
docs: <what documentation changed>

# For chores:
chore: <maintenance task>
```

**Always include:**
```
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 10) Row-Level Security (RLS) Patterns

**Default stance: Deny by default**

Common patterns in this codebase:

```sql
-- Students can read/write their own data
CREATE POLICY "students_own_data" ON student_notes
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE student_id = student_notes.student_id
        AND role = 'student'
    )
  );

-- Parents can read linked students' data
CREATE POLICY "parents_linked_students" ON student_notes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT p.user_id FROM profiles p
      JOIN parent_student_links psl ON psl.parent_id = p.parent_id
      WHERE psl.student_id = student_notes.student_id
        AND p.role = 'parent'
    )
  );

-- Advisors can read assigned students' data
CREATE POLICY "advisors_assigned_students" ON student_notes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE advisor_id = (
        SELECT advisor_id FROM profiles
        WHERE student_id = student_notes.student_id
      ) AND role = 'advisor'
    )
  );
```

**Avoid:**
- `select("*")` in RLS policies (be explicit)
- Broad read access across all students
- Policies that don't filter by authenticated user

---

## 11) Output Requirements (End-of-Task Report)

At the end of every task, report:

1. **Branch name** (from `git status`)
2. **Commands executed** (in order, with results)
3. **Files changed** (list with brief descriptions)
4. **Migration filename(s)** created (if applicable)
5. **Confirmation**: "No existing migrations were edited"
6. **Lint/build/test results** (pass/fail with error summary if failed)
7. **Manual test path** (click-by-click verification steps)
8. **Git status** after commit/push

---

## 12) Stop Conditions (When to STOP and Ask)

Stop immediately and ask the user if:

- ❌ Current branch is wrong or unclear
- ❌ Working tree is dirty and changes are relevant to task
- ❌ Unsure which table/column names to use
- ❌ Unsure about desired UX behavior
- ❌ A Supabase command fails with unclear error
- ❌ Unexpected file changes appear in `git status`
- ❌ Scope must expand beyond stated contract
- ❌ Migration history appears inconsistent
- ❌ Type errors cannot be resolved locally
- ❌ Required environment variable is missing
- ❌ Existing schema contradicts the plan

**When in doubt: STOP and ASK. Never guess.**

---

## 13) Handling Common Quirks

### `supabase db pull` non-zero exit

Treat as non-blocking ONLY if ALL are true:
- Output says "No schema changes found"
- `git status` shows no unexpected new migrations
- `supabase migration list` shows local/remote in sync

### Port 54320 already allocated

- STOP and recommend `supabase stop`
- Wait for user approval before proceeding

### Pre-commit hooks auto-modify files

If `git commit` succeeds but hook modifies files:
- Stage modified files
- Use `git commit --amend` ONLY for this specific case
- Otherwise, create a new commit

---

## 14) Related Documentation

**Agent operation modes:**
- [docs/agents/codex-rules.strict.md](docs/agents/codex-rules.strict.md) - Full strict mode rules
- [docs/agents/codex-rules.autonomy.md](docs/agents/codex-rules.autonomy.md) - Full autonomy mode rules
- [docs/agents/slice-runner.md](docs/agents/slice-runner.md) - Slice execution workflow

**Project documentation:**
- [docs/project/data-realization-plan.md](docs/project/data-realization-plan.md) - Current implementation tracker
- [docs/Attributions.md](docs/Attributions.md) - Third-party licenses

---

## 15) Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  BEFORE CODING                                  │
├─────────────────────────────────────────────────┤
│  1. git status (confirm branch + clean)         │
│  2. Restate objective (1-2 sentences)           │
│  3. List rules to follow (3-6 items)            │
│  4. Declare what NOT to do                      │
│  5. Define scope contract                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  MIGRATION WORKFLOW                             │
├─────────────────────────────────────────────────┤
│  1. supabase migration new <name>               │
│  2. Edit ONLY new file                          │
│  3. supabase db push                            │
│  4. supabase db pull                            │
│  5. supabase migration list                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  BEFORE COMMIT                                  │
├─────────────────────────────────────────────────┤
│  1. git diff (review changes)                   │
│  2. Check: only intended files                  │
│  3. Check: no secrets                           │
│  4. Check: no old migrations edited             │
│  5. npm run build (for non-trivial)            │
│  6. Commit with proper format                   │
│  7. git push                                    │
│  8. git status (confirm pushed)                 │
└─────────────────────────────────────────────────┘
```

---

**If this file conflicts with other instructions, this file takes precedence unless the user explicitly overrides it in their prompt.**

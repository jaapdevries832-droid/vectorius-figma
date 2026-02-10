# Vectorius PRD Pivot Plan 5: Structural Refactoring & Safety Fixes

**Created**: 2026-02-09
**Branch**: lesson-55 -> new branch `prd-5-refactor`
**Target**: Address critical safety bugs, reduce duplication, normalize naming, and improve architectural boundaries identified in codebase review.

---

## Context

A comprehensive codebase review revealed that while the product is functional (lint/type-check/build pass), core boundaries are weak, responsibilities are mixed, and duplication is high. The highest-risk issues are: an assignment status enum mismatch generating false alerts, modals closing before async saves complete, parent queries relying solely on RLS with no app-level filter, and duplicated auth logic drifting across pages. This PRD addresses all findings in priority order across three phases.

---

## Key Changes Summary

- **Normalize assignment status** to "done" (matching DB enum) and fix alert false positives
- **Fix modal save contracts** to only close on success
- **Add explicit parent query filters** and eliminate N+1 advisor lookups
- **Remove dead code** (LoginScreen, FloatingChatDrawer) and align README
- **Extract shared auth layer** from 4 duplicated implementations
- **Unify advisor/mentor naming** across components and types
- **Fix skills data source** from stale localStorage to DB
- **Consolidate Azure API adapter** from 3 duplicates to 1
- **Standardize imports** and fix dependency inversion

---

## A) Issues to Address

| # | Issue | Location | Priority |
|---|-------|----------|----------|
| 1 | Assignment status uses both "done" and "completed" but DB enum only has "done"; alerts ignore done -> false parent alerts | AssignmentsPage:564,763, StudentDashboard:290,316, ParentReportsPage:124, StudentProfileModal:98, supabase/functions/parent-alerts/index.ts:45,55 | Must Fix |
| 2 | Modals close immediately after async save, losing context on failure | AssignmentModal:121-122 · AddEventModal:104-105 | High |
| 3 | Parent student query has no parent_id filter (relies on RLS only) + N+1 advisor note lookups | ParentDashboardWrapper:154-156,237-243 | High |
| 4 | Dead surfaces (LoginScreen, FloatingChatDrawer) not imported; README claims floating drawer | LoginScreen.tsx · FloatingChatDrawer.tsx · README.md | Medium |
| 5 | Auth/join session check duplicated in 4 pages with behavioral drift | login/page.tsx:27-62 · join/page.tsx:27-44 · join/advisor/page.tsx:27-44 · join/parent/page.tsx | High |
| 6 | Azure API client wiring duplicated in 3 routes | api/chat/route.ts:15 · api/generate-study-plan/route.ts:18 · api/parse-email/route.ts:13 | Medium |
| 7 | "Advisor" in DB/logic but "Mentor" in component names | MentorSkills.tsx · layout.tsx:116 · MentorNotification type | High |
| 8 | Skills count reads localStorage while skills system is DB-backed | StudentDashboard:91-102 vs StudentSkills:93-126 | Medium |
| 9 | Mixed import conventions (@/lib/* and app/lib/* interleaved) + dependency inversion (lib/student-schedule.ts imports app/lib) | 14 component files · lib/student-schedule.ts:3 | Medium |
| 10 | Parent flow reuses advisor-named state (advisorStudents) for children | AssignmentsPage:124,257 | Medium |
| 11 | Role page silently falls back to StudentDashboard for unknown roles | app/(dash)/[role]/page.tsx:12 | High |
| 12 | Placeholder UI buttons without handlers | AssignmentsPage:867-869 | Medium |
| 13 | Persona route triggers dynamic-server-usage build warning | api/auth/persona/route.ts | Low |
| 14 | Mixed UX patterns (confirm/alert + toast) | AchievementsPage:134,159 · AssignmentsPage:589 · NotesPage:226 | Medium |
| 15 | Middleware matcher/comment intent is unclear for API routes; behavior and docs can drift | middleware.ts:8,57,59 | Medium |

---

## B) Implementation Plan (Risk-Adjusted Sequencing)

### Phase 1: Must Fix Now (safety + correctness)

---

### Slice S5-A: Assignment Status Normalization

**Goal**: Standardize on `"done"` (the value defined in the DB enum) everywhere; remove phantom `"completed"` checks; fix alert generation.

**Issues Addressed**: #1

#### DB + RLS Changes

None required — the DB enum already defines `"done"` correctly. The problem is code-side only.

#### Frontend / Library Changes

**Modify `supabase/functions/parent-alerts/index.ts`**:
- Lines ~45,55: Update alert filters to correctly recognize `"done"` status so completed assignments are excluded from overdue/missing alerts

**Modify `components/AssignmentsPage.tsx`**:
- Line 564: Confirm status is set to `'done'` (already correct)
- Line 763: Remove `|| a.status === 'completed'` fallback — use only `a.status === 'done'`

**Modify `components/StudentDashboard.tsx`**:
- Lines 290, 316: Remove `|| row.status === "completed"` — use only `row.status === "done"`

**Modify `components/ParentReportsPage.tsx`**:
- Line 124: Change `.in("status", ["completed", "done"])` → `.eq("status", "done")`
- Line 140: Change `.not("status", "in", "(completed,done)")` → `.neq("status", "done")`

**Modify `components/StudentProfileModal.tsx`**:
- Lines 98, 102: Remove `|| a.status === "completed"` — use only `a.status === "done"`

**New `lib/constants/assignment-status.ts`** (optional shared constant):
```typescript
export const ASSIGNMENT_DONE = "done" as const;
export const ASSIGNMENT_STATUSES = ["todo", "in_progress", "done", "blocked", "archived"] as const;
```

#### Acceptance Criteria

- [ ] All `"completed"` string literals removed from assignment status checks
- [ ] `supabase/functions/parent-alerts/index.ts` correctly filters out `"done"` assignments from parent alerts
- [ ] `npm run build` and `npm run type-check` pass
- [ ] No `status === "completed"` checks remain in app code (grep confirms)

#### Manual Test Script

1. Log in as student → mark an assignment as done → verify status shows "done"
2. Log in as parent → check alerts → verify no false alert for the completed assignment
3. Navigate to parent reports → verify done assignments appear in completed section
4. Open student profile modal → verify done count is accurate

---

### Slice S5-B: Modal Save Safety

**Goal**: Modals wait for async save result before closing; show loading state; only close on success.

**Issues Addressed**: #2

#### Frontend Changes

**Modify `components/AssignmentModal.tsx`**:
- Change `onSave` prop type to `(data: ...) => Promise<boolean>` (returns success/failure)
- Add `isSaving` local state
- On submit: set `isSaving=true`, `const ok = await onSave(...)`, only call `onClose()` if `ok === true`
- Disable save button and show spinner while `isSaving`
- On failure: keep modal open, show toast error

**Modify `components/AddEventModal.tsx`**:
- Same pattern: async onSave, loading state, close only on success

**Modify consumers** (components that pass `onSave` to these modals):
- `AssignmentsPage.tsx` (addAssignment / editAssignment callbacks): wrap in try/catch, return `true`/`false`
- `ParentDashboardWrapper.tsx` (handleSaveSuggestion): same pattern
- `WeeklyPlanner.tsx` (if it uses AddEventModal): same pattern

#### Acceptance Criteria

- [ ] AssignmentModal stays open if save fails (simulate network error)
- [ ] AddEventModal stays open if save fails
- [ ] Save button shows loading state during async operation
- [ ] Modal closes normally on successful save
- [ ] `npm run type-check` passes (onSave signature change propagated)

#### Manual Test Script

1. Open assignment modal → fill form → save → verify modal closes on success
2. (Dev tools) Block network → attempt save → verify modal stays open with error toast
3. Repeat for AddEventModal with calendar events

---

### Slice S5-C: Parent Data Query Safety

**Goal**: Add explicit app-level parent filter to student query; replace N+1 advisor note lookups with DB view.

**Issues Addressed**: #3

**Execution Strategy**:
- `S5-C1` (migration only): create/deploy the view and validate read behavior
- `S5-C2` (app cutover): switch parent dashboard query to the new view in a separate commit

#### DB + RLS Changes

**New migration**: `supabase migration new parent_advisor_notes_view`

Create a view that joins advisor notes with advisor profiles to eliminate N+1:
```sql
CREATE OR REPLACE VIEW advisor_notes_with_profiles
WITH (security_invoker = true) AS
SELECT
  an.*,
  p.first_name AS advisor_first_name,
  p.last_name AS advisor_last_name,
  p.email AS advisor_email
FROM advisor_notes an
LEFT JOIN profiles p ON p.id = an.advisor_id;
```

Grant appropriate access and add RLS policy if needed.

#### Frontend Changes

**Modify `components/ParentDashboardWrapper.tsx`**:
- Line ~154: Add explicit filter: `.eq("parent_id", userId)` to student query (even though RLS also filters)
- Lines ~237-243: Replace Promise.all N+1 pattern with single query to new `advisor_notes_with_profiles` view

#### Acceptance Criteria

- [ ] Student query includes explicit `.eq("parent_id", userId)` filter
- [ ] No more individual profile lookups in Promise.all loop
- [ ] `supabase db push` succeeds
- [ ] Parent dashboard loads correctly with advisor names on notes
- [ ] Parent cannot see other parents' students (verify in app)
- [ ] View access behavior is validated with parent-role test account (no cross-parent leakage)

#### Manual Test Script

1. Log in as parent → verify student list only shows linked children
2. Navigate to notes → verify advisor names appear correctly
3. Check network tab → confirm single query for advisor notes (not N+1)

---

### Slice S5-D: Dead Surface Cleanup

**Goal**: Remove unused components and align README with actual features.

**Issues Addressed**: #4, #13

#### Frontend Changes

**Delete** `components/LoginScreen.tsx` (not imported anywhere)
**Delete** `components/FloatingChatDrawer.tsx` (not imported anywhere)

**Modify `README.md`**:
- Remove reference to floating drawer support (line ~15)
- Ensure feature list matches actual implemented features

**Modify `app/api/auth/persona/route.ts`**:
- Add `export const dynamic = 'force-dynamic'` at top of file to avoid noisy dynamic server usage warnings during build

#### Acceptance Criteria

- [ ] `LoginScreen.tsx` and `FloatingChatDrawer.tsx` deleted
- [ ] No broken imports (grep for both filenames)
- [ ] README accurately reflects current features
- [ ] Build output clean (no persona dynamic-server-usage warning)
- [ ] `npm run build` passes

#### Manual Test Script

1. Run `npm run build` → verify clean output (no warnings about dynamic usage)
2. Verify login flow still works (uses app/login/page.tsx, not deleted LoginScreen)
3. Verify chat still works (uses ChatInterface, not deleted FloatingChatDrawer)

---

### Phase 2: Next (structure + clarity)

---

### Slice S5-E: Shared Auth Session Layer

**Goal**: Extract duplicated auth/session check logic into a shared utility consumed by all auth pages.

**Issues Addressed**: #5

#### Frontend Changes

**New `lib/auth/check-session.ts`**:
```typescript
export async function checkExistingSession(
  supabase: SupabaseClient,
  router: AppRouterInstance
): Promise<{ redirected: boolean }> {
  // Consolidated logic from login + join pages:
  // 1. Check supabase.auth.getSession()
  // 2. If session exists, fetch profile via getCurrentProfile()
  // 3. Redirect to role dashboard if profile found
  // 4. Return { redirected: true/false }
}
```

**Modify `app/login/page.tsx`**:
- Replace lines ~27-62 (checkExistingSession) with call to shared utility

**Modify `app/join/page.tsx`**:
- Replace lines ~27-44 (checkSession) with call to shared utility

**Modify `app/join/advisor/page.tsx`**:
- Replace lines ~27-44 (checkSession) with call to shared utility

**Modify `app/join/parent/page.tsx`** (if it has same pattern):
- Same replacement

#### Acceptance Criteria

- [ ] All 4 pages use the shared `checkExistingSession` utility
- [ ] No duplicated session check logic remains in page files
- [ ] Login flow works identically to before
- [ ] Join flows work identically to before
- [ ] `npm run type-check` passes

#### Manual Test Script

1. Visit /login while logged in → verify redirect to dashboard
2. Visit /join while logged in → verify redirect to dashboard
3. Visit /join/advisor while logged in → verify redirect
4. Log out → visit each page → verify login/join forms appear

---

### Slice S5-F: Advisor/Mentor Naming Unification

**Goal**: Rename "Mentor" to "Advisor" in all component names and types to match DB schema and business logic.

**Issues Addressed**: #7, #10

#### Frontend Changes

**Rename file** `components/MentorSkills.tsx` → `components/AdvisorSkills.tsx`
- Rename component: `MentorSkills` → `AdvisorSkills`
- Rename internal type: `MentorNotification` → `AdvisorNotification`

**Modify `app/(dash)/[role]/layout.tsx`**:
- Update import: `MentorSkills` → `AdvisorSkills`
- Line 116: `<AdvisorSkills />` (was `<MentorSkills />`)

**Modify `components/AssignmentsPage.tsx`**:
- Line 124: Rename `advisorStudents` state variable used for parent children to `linkedStudents` (or `parentStudents`)
- Line 257: Update references accordingly

#### Acceptance Criteria

- [ ] No references to "MentorSkills" remain in codebase
- [ ] No references to "MentorNotification" remain in codebase
- [ ] `advisorStudents` renamed to `linkedStudents` in parent context within AssignmentsPage
- [ ] Advisor skills page renders correctly
- [ ] `npm run build` passes

#### Manual Test Script

1. Log in as advisor → navigate to Skills → verify page renders correctly
2. Log in as parent → navigate to Assignments → verify student list loads
3. Grep codebase for "Mentor" → confirm only legitimate uses remain (if any)

---

### Slice S5-G: Skills Data Source Fix + Azure Adapter

**Goal**: Fix skills count to read from DB instead of stale localStorage; consolidate Azure OpenAI client wiring.

**Issues Addressed**: #6, #8

**Execution Strategy**:
- `S5-G1` (skills source): switch StudentDashboard skills count from localStorage to DB
- `S5-G2` (Azure adapter): consolidate API route client wiring in a separate commit

#### Frontend Changes

**Modify `components/StudentDashboard.tsx`**:
- Lines 91-102: Replace localStorage read with Supabase query to `skill_assignments` table
- Use same query pattern as `StudentSkills.tsx:93-126` for consistency

**New `lib/azure-openai.ts`**:
```typescript
export function isAzureEnabled(): boolean {
  // Single source of truth for Azure env check
}

export function createAzureClient(): AzureOpenAI {
  // Single client factory
}
```

**Modify 3 API routes** to use shared adapter:
- `app/api/chat/route.ts`: Replace inline isEnabled + client creation
- `app/api/generate-study-plan/route.ts`: Same
- `app/api/parse-email/route.ts`: Same

#### Acceptance Criteria

- [ ] StudentDashboard skills count matches StudentSkills page count
- [ ] No localStorage read for skills in StudentDashboard
- [ ] All 3 API routes use shared `lib/azure-openai.ts`
- [ ] No duplicate isEnabled() functions in API routes
- [ ] `npm run build` passes
- [ ] Chat, study plan generation, and email parsing still work

#### Manual Test Script

1. Log in as student → check skills count on dashboard → navigate to skills page → verify counts match
2. Test chat functionality → verify AI responses work
3. Test study plan generation → verify it works
4. Test email parsing → verify it works

---

### Slice S5-H: Import Convention & Dependency Cleanup

**Goal**: Remove `app/lib` boundary leakage by moving shared modules to `lib/` and standardize imports on `@/lib/*`.

**Issues Addressed**: #9, #15

#### Frontend Changes

**Move shared modules out of `app/lib`**:
- Move shared runtime/domain modules to root `lib/` (for example: domain types, role layout context, current-user storage helper, shared UI types)
- Update imports to use `@/lib/*` as the canonical path
- Keep `app/lib` only for route-group-local concerns (if any remain)

**Fix dependency inversion**:
- Update `lib/student-schedule.ts` (and any other root lib file) so no `lib/*` module imports from `app/lib/*`
- Ensure root libraries only depend on root libraries or external packages

**Align middleware behavior and documentation**:
- Keep middleware in place unless explicitly de-scoped
- Make matcher behavior and comments consistent (explicitly decide whether API routes are included or excluded)
- Record the decision in comments and this PRD acceptance notes

#### Acceptance Criteria

- [ ] Shared modules used across the app no longer live under `app/lib/*`
- [ ] Canonical imports for shared modules use `@/lib/*`
- [ ] `lib/student-schedule.ts` no longer imports from `app/lib/`
- [ ] Middleware matcher and comments are consistent with intended API-route coverage
- [ ] `npm run build` passes
- [ ] `npm run type-check` passes

#### Manual Test Script

1. Run `npm run build` → verify no import resolution errors
2. Spot-check 3-4 pages → verify components render correctly
3. Grep for bare `from "app/lib` or `from 'app/lib` → confirm zero results for shared modules

---

### Phase 3: Later (route + platform maturity)

---

### Slice S5-I: Unknown Role Handling

**Goal**: Replace silent student fallback with proper error handling for unknown roles.

**Issues Addressed**: #11

#### Frontend Changes

**Modify `app/(dash)/[role]/page.tsx`**:
- Line 12: Replace `return <StudentDashboard />` fallback with redirect to `/login` or a 404/error page
- Add logging for unknown role access attempts

#### Acceptance Criteria

- [ ] Unknown role (e.g., `/invalidrole`) shows error or redirects to login
- [ ] Valid roles (student, parent, advisor) still render correctly
- [ ] `npm run build` passes

#### Manual Test Script

1. Navigate to `/student` → verify StudentDashboard renders
2. Navigate to `/parent` → verify ParentDashboard renders
3. Navigate to `/advisor` → verify AdvisorDashboard renders
4. Navigate to `/invalidrole` → verify redirect to login (not StudentDashboard)

---

### Slice S5-J: UX Pattern Standardization

**Goal**: Replace browser `confirm()`/`alert()` with Radix AlertDialog; remove placeholder buttons; add test script.

**Issues Addressed**: #12, #14

#### Frontend Changes

**New `components/ui/ConfirmDialog.tsx`** (wraps Radix AlertDialog, already in deps):
```typescript
// Reusable destructive-action confirmation dialog
// Props: open, onConfirm, onCancel, title, description, confirmLabel
// Uses @radix-ui/react-alert-dialog (already installed)
```

**Modify `components/AchievementsPage.tsx`**:
- Lines 134, 159: Replace `confirm()` and `alert()` with `<ConfirmDialog>`

**Modify `components/AssignmentsPage.tsx`**:
- Line 589: Replace `confirm()` with `<ConfirmDialog>`
- Lines 867-869: Remove placeholder buttons or wire up handlers

**Modify `components/NotesPage.tsx`**:
- Line 226: Replace `window.confirm()` with `<ConfirmDialog>`

**Modify `components/StudentDashboard.tsx`**:
- Line 628: Replace `window.confirm()` with `<ConfirmDialog>`

**Modify `package.json`**:
- Add `"test": "echo \"No tests configured yet\" && exit 0"` as placeholder

#### Acceptance Criteria

- [ ] No `window.confirm()` or `window.alert()` calls remain in components
- [ ] All destructive confirmations use shared `ConfirmDialog` (Radix AlertDialog)
- [ ] Placeholder buttons either removed or wired to handlers
- [ ] `npm run test` script exists (even if placeholder)
- [ ] `npm run build` passes

#### Manual Test Script

1. Student: delete a note → verify confirmation dialog (not browser confirm)
2. Student: complete an assignment → verify toast feedback
3. Parent: redeem achievement → verify confirmation dialog
4. Check assignments page → verify no non-functional buttons remain

---

## C) Dependencies & Sequencing

```
Phase 1 (Must Fix - safety first):
  S5-A (Status Enum)            -> no deps
  S5-B (Modal Safety)           -> no deps
  S5-C1 (Parent view migration) -> no deps
  S5-C2 (Parent query cutover)  -> after S5-C1
  S5-I (Unknown role handling)  -> after S5-A

Phase 2 (Targeted structure + behavior):
  S5-D (Dead code cleanup)      -> no deps
  S5-E (Shared auth layer)      -> no deps
  S5-F (Advisor naming)         -> no deps
  S5-G1 (Skills DB source)      -> after S5-A
  S5-G2 (Azure adapter)         -> after S5-G1
  S5-J (UX confirmation pattern)-> no deps

Phase 3 (Highest-churn refactor):
  S5-H (Import/dependency cleanup) -> after S5-F and S5-G2; execute last
```

**Recommended Execution Order**: S5-A -> S5-B -> S5-C1 -> S5-C2 -> S5-I -> S5-D -> S5-E -> S5-F -> S5-G1 -> S5-G2 -> S5-J -> S5-H

Within each phase, reorder only when dependencies remain intact; do not combine `S5-C1/S5-C2` or `S5-G1/S5-G2` in a single commit.

---

## C1) Rollback Matrix (Per Slice)

| Slice | Blast Radius | Failure Signal (Primary) | Immediate Rollback | Data Risk |
|-------|--------------|--------------------------|--------------------|-----------|
| S5-A | Low-Medium | False positives/negatives in assignment completion and parent alerts | `git revert <sha>` and redeploy `supabase/functions/parent-alerts/index.ts` | None |
| S5-B | Medium | Modal closes on failed save, duplicate submits, UI stuck loading | `git revert <sha>` for modal contract + caller changes | None |
| S5-C1 | Low | Migration/view errors or permission failures in parent note reads | Fix-forward migration to recreate or drop/replace `advisor_notes_with_profiles` | Low (view-only) |
| S5-C2 | Medium-High | Parent notes fail to load or show incorrect advisor metadata | `git revert <sha>` to restore pre-view query path | None |
| S5-I | Low-Medium | Valid roles misroute or unknown role handling loops | `git revert <sha>` on `app/(dash)/[role]/page.tsx` | None |
| S5-D | Low-Medium | Build/runtime import failure after deleting dead components | `git revert <sha>` restoring deleted files and README/route adjustments | None |
| S5-E | Medium | Login/join redirects regress or auth flow loops | `git revert <sha>` for shared helper adoption; keep per-page logic temporarily | None |
| S5-F | Medium | Import/type failures from rename; advisor UI missing | `git revert <sha>` or add temporary alias export then follow-up cleanup | None |
| S5-G1 | Medium | Dashboard skills count diverges or query failures | `git revert <sha>` restoring previous StudentDashboard source path | None |
| S5-G2 | High | Chat/study-plan/parse-email endpoint failures | `git revert <sha>` restoring per-route client construction | None |
| S5-J | Medium | Confirm dialog state bugs block destructive actions | `git revert <sha>` on affected page(s) or full slice | None |
| S5-H | High | Wide import resolution failures or middleware behavior drift | Revert by batch commit (not single mega-commit) to isolate breakpoints | None |

**Rollback Rule**: Each slice or sub-slice must land as its own commit so rollback is one command (`git revert <sha>`) whenever possible.

---

## D) Files to Modify Summary

| Slice | New Files | Modified Files | Migrations |
|-------|-----------|----------------|------------|
| S5-A | `lib/constants/assignment-status.ts` (optional) | `components/AssignmentsPage.tsx`, `components/StudentDashboard.tsx`, `components/ParentReportsPage.tsx`, `components/StudentProfileModal.tsx`, `supabase/functions/parent-alerts/index.ts` | 0 |
| S5-B | None | `components/AssignmentModal.tsx`, `components/AddEventModal.tsx`, `components/AssignmentsPage.tsx`, `components/ParentDashboardWrapper.tsx`, `components/AdvisorDashboard.tsx`, `components/WeeklyPlanner.tsx` (if used) | 0 |
| S5-C1 | None | None (migration-only slice) | 1 (`parent_advisor_notes_view`) |
| S5-C2 | None | `components/ParentDashboardWrapper.tsx` | 0 |
| S5-I | None | `app/(dash)/[role]/page.tsx` | 0 |
| S5-D | None | `README.md`, `app/api/auth/persona/route.ts` (plus delete `components/LoginScreen.tsx`, `components/FloatingChatDrawer.tsx`) | 0 |
| S5-E | `lib/auth/check-session.ts` | `app/login/page.tsx`, `app/join/page.tsx`, `app/join/advisor/page.tsx`, `app/join/parent/page.tsx` | 0 |
| S5-F | `components/AdvisorSkills.tsx` (rename from `components/MentorSkills.tsx`) | `app/(dash)/[role]/layout.tsx`, `components/AssignmentsPage.tsx` | 0 |
| S5-G1 | None | `components/StudentDashboard.tsx` | 0 |
| S5-G2 | `lib/azure-openai.ts` | `app/api/chat/route.ts`, `app/api/generate-study-plan/route.ts`, `app/api/parse-email/route.ts` | 0 |
| S5-J | `components/ui/ConfirmDialog.tsx` | `components/AchievementsPage.tsx`, `components/AssignmentsPage.tsx`, `components/NotesPage.tsx`, `components/StudentDashboard.tsx`, `package.json` | 0 |
| S5-H | None | Files currently importing shared modules from `app/lib/*`, including `lib/student-schedule.ts` and middleware comments/matcher in `middleware.ts` | 0 |

---

## E) Slice Status Tracker

Legend: [ ] not started | [~] in progress | [x] complete | [!] blocked

| Slice | Name | Status | PR/Commit | Completed | Notes |
|------:|------|--------|-----------|-----------|-------|
| S5-A | Assignment Status Normalization | [x] | ab2111a | 2026-02-10 | Completed; lint/type-check/build pass; manual path: S5-A script |
| S5-B | Modal Save Safety | [x] | a3e0126 | 2026-02-10 | Completed; lint/type-check/build pass; manual path: S5-B script |
| S5-C1 | Parent View Migration | [x] | 7dc3fd6 | 2026-02-10 | Completed; db push/pull/list + lint/build pass; added view + remote schema sync |
| S5-C2 | Parent Query Cutover | [x] | 5ae5680 | 2026-02-10 | Completed; parent_id app filter + single view query; lint/type-check/build pass |
| S5-I | Unknown Role Handling | [x] | 147f368 | 2026-02-10 | Completed; unknown roles log and redirect to /login; lint/type-check/build pass |
| S5-D | Dead Surface Cleanup | [x] | 35799aa | 2026-02-10 | Completed; deleted dead components, README aligned, persona route forced dynamic |
| S5-E | Shared Auth Session Layer | [x] | 87af740 | 2026-02-10 | Completed; login/join pages share check-session utility; lint/type-check/build pass |
| S5-F | Advisor/Mentor Naming | [x] | 122316f | 2026-02-10 | Completed; includes rename commit 1c6c245; lint/type-check/build pass |
| S5-G1 | Skills DB Source | [ ] | - | - | Data correctness |
| S5-G2 | Azure Adapter Consolidation | [ ] | - | - | DRY API wiring |
| S5-J | UX Pattern Standardization | [ ] | - | - | Consistency |
| S5-H | Import & Dependency Cleanup | [ ] | - | - | After S5-F and S5-G2 |

---

## F) Verification Checklist (Per Slice)

- [ ] `supabase db push` succeeds (if migration in slice)
- [ ] `supabase db pull` confirms sync (if migration in slice)
- [ ] `supabase migration list` shows aligned (if migration in slice)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run type-check` passes
- [ ] Manual test script executed successfully
- [ ] Commit message: `slice S5-X: <description>`
- [ ] Co-Authored-By included
- [ ] Slice marked [x] in tracker

---

## G) What We Are NOT Doing

- **Not replacing the switch-router with nested routes** — that's a larger architectural change deferred beyond this PRD (noted in review as "Later")
- **Not creating full feature modules** (features/assignments/queries.ts etc.) — extracting data access is desirable but too large for this PRD; S5-G does targeted extraction only
- **Not adding integration tests** — test infrastructure setup is placeholder only (S5-J); full test suite is a separate initiative
- **Not collapsing duplicate chat components** — noted in review but deferred
- **Not redesigning navigation** — URL-addressable routes are deferred
- **Not theming/design-system work** — S5-J standardizes patterns but doesn't build a theme system
- **Not touching existing migration files** — fix-forward only

---

## H) Agent Correction Checklist

### Before Each Slice
- [ ] Run `git status` — confirm on correct branch, clean working tree
- [ ] Restate slice objective in 1-2 sentences
- [ ] List files to modify (cross-reference with Section D)

### During Implementation
- [ ] Do NOT edit any existing migration file in `/supabase/migrations/`
- [ ] Do NOT add "completed" to the assignment status enum (standardize on "done")
- [ ] Do NOT rename files without updating ALL import references
- [ ] Do NOT change middleware route coverage without updating matcher comments and documenting intent

### After Each Slice
- [ ] Run `npm run lint && npm run build && npm run type-check`
- [ ] Run `git diff` — confirm only intended files changed
- [ ] Confirm no secrets in diff
- [ ] Commit with format: `slice S5-X: <description>`
- [ ] Mark slice [x] in tracker with commit SHA

---

## I) Open Questions from Review (Resolved)

| Question | Resolution |
|----------|-----------|
| Are `profiles.id` and `auth.users.id` intentionally identical? | **Assumed yes** — no changes planned. If wrong, needs immediate separate fix. |
| Is RLS the only intended guardrail for role restrictions? | **No** — S5-C adds explicit app-level filters alongside RLS (defense in depth). |
| Is persona auth non-production tooling? | **Assumed yes** — S5-D marks route as `force-dynamic`; feature flag deferred. |
| Standardize on "done" or add "completed" to enum? | **Standardize on "done"** — matches existing DB enum, avoids migration. |

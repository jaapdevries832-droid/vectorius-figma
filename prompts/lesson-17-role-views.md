# Codex Task — Lesson 17: Role‑Based Views & Supabase (Local Run)

**Mode & Branch**  
Work **locally** in this repo on the currently checked‑out branch **`Lesson-17`**. Do **not** use cloud. Use my local `.env.local` for Supabase. **Do not commit secrets.**

## Goal
Fix role-based views so Student, Parent, and Mentor modes work again, drawing real lists/data from Supabase, plus small mock sections where specified.

## Entry Point / Scope
- Primary file: `/web/app/page.js` (Next.js App Router).
- Create small client components under `/web/components` as needed.
- Maintain **.jsx** across UI components.
- Keep existing behavior; only add what is required below.

## Requirements

### A) Student mode
- A role selector allows choosing **Student**.
- **Student dropdown** populated from Supabase (ids + display names).
- When a student is selected, show:
  - **Weekly plan** (MOCK data, client-side array) with a per-item progress status.
  - **Homework & Projects** section (MOCK data).
  - **Progress** section (progress bar / summary; MOCK or simple computed %).
  - **AI chat** section (MOCK UI only; no backend call).
- All UI survives refresh; default to first student if none selected.

### B) Parent mode
- **Parent selector** (from Supabase).
- When a parent is selected, show a **child selector** populated from Supabase for that parent’s linked children.
- Show for the selected child:
  - **Progress overview** (simple bar/summary, MOCK or computed).
  - **Upcoming deadlines** (MOCK list).
  - **Mentor notes** (MOCK list for now; if a real `mentor_notes` table exists, read it instead).
- If the schema reveals a parent–children relationship through a junction table, use it. Otherwise, use the direct FK the schema provides.

### C) Mentor mode
- **Mentor selector** (from Supabase).
- **Student selector** (from Supabase), filtered by the selected mentor **if** that relationship exists; otherwise show all students.
- Show:
  - **Student summary + progress bar**.
  - **Mentor notes list** (from DB if a notes table exists; otherwise MOCK).
  - **Ability to add a new note** (if DB table exists; otherwise render disabled UI with helper text).
- Notes write: only if a notes table is present and the schema is clear. Otherwise skip writes and keep read-only MOCK.

## Data & Schema Handling
- Use the existing Supabase client if present (e.g., `/web/lib/supabaseClient.js`).  
  If missing, add `/web/lib/supabaseClient.js` that reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `process.env` and exports a singleton client.
- **Before writing queries**, scan `/db`, `/supabase`, migrations, and seed files in the repo to discover canonical table and column names for:
  - `students`
  - `parents` (or `guardians`)
  - `mentors` (or `advisors`)
  - relationships (e.g., `parent_children`, `mentor_students`)
  - `notes` (`mentor_notes`), and any assignments/homework/projects tables if present
- Build queries that match the discovered schema. If names differ, adapt accordingly (e.g., advisors instead of mentors).
- If the schema is unclear or missing for any piece, keep that piece as explicit **MOCK** data with a clear **TODO** comment indicating the expected table and suggested columns.

## UX / Implementation Details
- Any component using hooks must be a **client component** (`"use client"`).
- Create small components as needed, for example:
  - `/web/components/RoleSelector.jsx`
  - `/web/components/StudentPanel.jsx`
  - `/web/components/ParentPanel.jsx`
  - `/web/components/MentorPanel.jsx`
  - `/web/components/Dropdown.jsx` (reusable)
  - `/web/components/ProgressBar.jsx`
  - `/web/components/WeeklyPlanMock.jsx`
  - `/web/components/HomeworkProjectsMock.jsx`
  - `/web/components/ChatMock.jsx`
  - `/web/components/MentorNotes.jsx` (read-only if no table)
- Handle loading/error states for all Supabase fetches.
- Keep styling minimal and consistent with the project (e.g., simple utility classes).
- **Do not** add heavy dependencies. Use existing stack. No server actions required; client fetch is fine.
- Preserve existing imports/exports in `/web/app/page.js` except where replacing now-broken logic.

## Test Plan (run locally)
- `cd web && npm run dev`
- **Student mode:** open root page, switch to Student, select a student → see StudentPanel with weekly plan, homework/projects, progress, mock chat.
- **Parent mode:** switch to Parent, select a parent → child selector appears; selecting a child shows progress overview, upcoming deadlines (mock), mentor notes (db if present else mock).
- **Mentor mode:** switch to Mentor, select mentor and student → see summary + progress bar; notes list loads (db if present); adding a note only if table exists.
- No console errors. Page is interactive without needing network calls beyond Supabase.

## Acceptance Criteria
- Role selector works and switches view state.
- Student/Parent/Mentor dropdowns are populated from Supabase using the repo’s actual schema.
- Parent child-selector is **filtered** to that parent’s children.
- Mentor student-selector is **filtered** if a mapping exists; otherwise unfiltered with a **TODO**.
- Student view shows weekly plan, homework/projects, progress, and mock AI chat.
- Parent view shows child progress, upcoming deadlines (mock), and mentor notes (db if available, else mock).
- Mentor view shows student summary, progress bar, notes (db if available; create-only if table exists).
- Uses **.jsx** for UI components; `"use client"` where hooks are used.
- No breaking changes to unrelated pages.
- Build works: `cd web && npm run build` (should not require network beyond npm install and local env).
- If any DB table is missing/ambiguous, code falls back to **MOCK** for that subsection and leaves a clear **TODO** with the expected table/columns.

## Deliverables
1. Modified `/web/app/page.js` to host role-based panels and selectors.
2. New components created under `/web/components` as needed (see UX section).
3. If missing, add `/web/lib/supabaseClient.js` (singleton) with env-based initialization.
4. Inline comments where the real schema dictated query shapes; **TODOs** where mocks stand in.
5. Local commit with message:  
   `chore(lesson-17): role selectors + student/parent/mentor panels with Supabase data (mock fallbacks where needed)`

## Output
- Show a **file-by-file change summary**.
- Show `git status` **before/after** staging.
- Show the final **commit hash**.
- Print quick **manual test steps** and the main URL to open in dev server.

## Begin
1. Inspect `/db` and seed files to infer table/column names for students, parents/guardians, mentors/advisors, relationships, notes.
2. Add/confirm Supabase client file.
3. Implement dropdowns + panels with real Supabase data for lists.
4. Add mock sections as specified.
5. Build locally to verify no type/import errors.
6. Stage, commit, and print outputs requested above.

# Slice 7 Scope — Assignments Persistence (LOCKED)

Branch: lesson-46  
Status: scope locked — do not expand  
Depends on: Slice 4 schedule view and/or existing course/enrollment tables

---

## Purpose

Slice 7 makes assignments real and consistent across the student experience by:
- persisting assignments in Supabase
- populating the Assignments UI from Supabase
- ensuring the Dashboard “Upcoming Assignments” reflects the same source of truth

This slice should eliminate mismatches between dashboard and assignments screens.

---

## Key Design Decision (Authoritative)

Assignments will be tied to existing classes/courses.

Allowed sources for classes:
- Prefer: `student_schedule_events` view (Slice 4)
- Or: existing enrollment/course tables if needed

This slice MUST NOT create a new “student classes” table or implement “Add Class” persistence.

---

## In Scope (Authoritative)

### 1) Database

Create the minimum schema required to persist assignments.

Create a new table:

**assignments**

Minimum required columns only:
- `id` (uuid, primary key)
- `student_id` (uuid, FK → students.id)
- `course_id` (uuid, FK → courses.id)  *(or equivalent course table; must match existing schema)*
- `title` (text)
- `type` (text)  *(e.g., Homework/Quiz/Test/Project as used by UI)*
- `due_date` (date)
- `notes` (text, nullable)
- `status` (text) *(e.g., "in_progress" | "completed"; keep minimal)*
- `created_at` (timestamp, default now)
- `completed_at` (timestamp, nullable)

No points, streaks, badges, or ledger entries in this slice.

All schema changes must be implemented via new SQL migrations only.
Never edit existing migrations. Fix-forward only.

---

### 2) Row Level Security (RLS)

Minimal least-privilege rules:

- **Select**
  - Student may read only their own assignments (`student_id`)
  - Mentor/advisor may read assignments only for authorized students (consistent with existing relationships)

- **Insert**
  - Student may insert assignments for themselves
  - Mentor/advisor may insert assignments for authorized students

- **Update**
  - Student may update status/completed_at for their own assignments
  - Mentor/advisor updates not required unless the UI already supports it

- **Delete**
  - Not required unless existing UI already supports deletion (avoid adding new UI actions)

If access rules are ambiguous:
- Default to DENY
- Stop and report rather than guessing broad access

---

### 3) Application Wiring (No UI redesign)

Replace demo/in-memory assignment data with Supabase-backed data in:

- `components/AssignmentsPage.tsx`
  - list assignments from Supabase
  - “Add Assignment” modal inserts into Supabase
  - “Mark Complete” updates assignment status in Supabase
  - Class dropdown must be populated from `student_schedule_events` (or existing course source)

- Student dashboard widget(s) that show upcoming assignments
  - must read from the same Supabase assignments source of truth
  - must match what appears on AssignmentsPage

UI layout/styling must remain visually unchanged.

Handlers must not fail silently; log clear console errors if required context is missing.

---

## Explicitly Out of Scope (Forbidden)

The following MUST NOT be implemented in Slice 7:

- Points / streaks / achievements / badges / rewards (Slice 8)
- Notifications and reminders
- Parent or advisor dashboard summaries (Slices 5 and 6)
- Class creation persistence (“Add Class” should remain non-persistent or be disabled, but do not wire it)
- Calendar integrations
- UI redesign, layout changes, new routes/pages, major refactors

If any of the above is required to proceed:
- STOP and report why

---

## Completion Criteria (All Required)

Slice 7 is complete only when ALL are true:

- assignments are persisted in Supabase via new migration(s)
- AssignmentsPage reads from Supabase and no longer uses demo/in-memory arrays
- Add Assignment creates a real persisted assignment
- Mark Complete persists status/completed_at
- Class dropdown is populated from real classes (schedule view or course source)
- Student dashboard upcoming assignments reflect the same persisted assignments
- Lint and build pass
- Slice 7 marked ✅ complete in `docs/data-realization-plan.md`
- Commit history includes:
  - one slice implementation commit
  - optional documentation-only commit to record SHA

---

## Notes

This slice intentionally does not solve class creation.
If “Add Class” needs to be disabled or made read-only to avoid confusion, that is acceptable
as long as the UI layout does not change.

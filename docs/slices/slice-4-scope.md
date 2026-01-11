# Slice 4 Scope — Student Schedule (LOCKED)

Branch: lesson-45  
Status: scope locked — do not expand  
Depends on: existing course / enrollment schema

---

## Purpose

Slice 4 replaces demo and hardcoded schedule/class data with real,
read-only schedule data derived from existing database tables.

This slice makes the student schedule honest and persistent without
introducing any new mutation paths.

---

## In Scope (Authoritative)

### 1) Database (Views Only)

Slice 4 WILL create exactly ONE database object:

### `student_schedule_events` (VIEW)

This view must be derived **only from existing tables**.
No new tables may be created in this slice.

Expected underlying tables (must already exist):
- `courses`
- `course_meetings`
- `student_course_enrollments` (or equivalent)

If any of these tables do not exist or differ materially:
- STOP and report the issue
- Do not guess or create new tables

#### Required fields (minimum set)
- `student_id`
- `course_id`
- `title`
- `teacher_name` (nullable)
- `location` (nullable)
- `day_of_week`
- `start_time`
- `end_time`
- `color` (nullable)

No additional computed or derived fields are allowed.

---

### 2) Row Level Security (RLS)

- RLS must be enforced via underlying tables or a security-invoker view
- Students may read **only their own rows**
- No write access is required
- No parent or advisor access in this slice

If RLS behavior is ambiguous:
- Default to DENY
- Prefer stopping over guessing

---

### 3) Application Wiring (READ-ONLY)

Replace demo schedule data in the following components:

#### `WeeklyPlanner.tsx`
- Remove `DEFAULT_CLASSES`
- Remove `ANNIE_CLASSES`
- Load schedule data from `student_schedule_events`

#### `AssignmentsPage.tsx`
- Replace demo/default class labels
- Use real course titles from `student_schedule_events`

UI behavior and layout must remain visually unchanged.

---

## Explicitly Out of Scope (Forbidden)

The following MUST NOT be implemented in Slice 4:

- Creating or editing courses
- Creating or editing schedules
- Teacher dashboards
- Parent schedule views
- Assignment creation logic
- Notifications
- Calendar integrations
- Drag-and-drop behavior
- Changes to week navigation logic
- UI redesign, layout, or styling changes
- New routes or pages

If any of the above are required to proceed:
- STOP and report why

---

## Completion Criteria (All Required)

Slice 4 is complete only when ALL of the following are true:

- `student_schedule_events` view exists via a new migration
- WeeklyPlanner renders using Supabase data
- AssignmentsPage class labels come from real data
- No demo schedule constants remain in code
- Lint and build pass
- Slice 4 is marked ✅ complete in `docs/data-realization-plan.md`
- Commit history includes:
  - one slice implementation commit
  - optional documentation-only commit to record the commit SHA

---

## Non-Negotiable Stop Conditions

The agent MUST STOP if:
- Required base tables do not exist
- Column names do not match expectations
- Join logic is ambiguous
- Safe RLS behavior cannot be determined

Stopping in these cases is considered correct behavior.

---

## Notes

This slice is intentionally read-only and dependency-sensitive.
Its goal is to replace fake schedule data with honest, derived state —
not to build a scheduling system.

Future slices may expand on this foundation.


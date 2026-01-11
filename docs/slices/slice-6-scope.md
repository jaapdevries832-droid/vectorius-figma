# Slice 6 Scope — Parent Data (LOCKED)

Branch: lesson-46  
Status: scope locked — do not expand  
Depends on: Slices 3 (notes), 4 (schedule), 7 (assignments)

---

## Purpose

Slice 6 makes the **parent experience real** by replacing demo/placeholder
parent dashboard data with read-only, Supabase-backed summaries derived from
existing student data.

This slice introduces **no new student-facing behavior** and **no new write
paths** for parents. It is intentionally read-only.

---

## In Scope (Authoritative)

### 1) Database (Views + Minimal Tables)

Slice 6 MAY create the following, **only if needed** to support the existing UI.

#### A) View: `parent_student_overview`
A per-student summary visible to a parent.

Minimum required fields:
- `parent_id`
- `student_id`
- `student_name`
- `upcoming_assignments_count`
- `completed_assignments_count`
- `overdue_assignments_count`
- `next_due_at` (nullable)
- `last_activity_at` (nullable)

Derived from existing tables:
- `students`
- `assignments`
- `student_notes` (optional, for activity timestamp)
- `courses` / schedule view if needed

No complex analytics. No historical aggregation beyond simple counts.

---

#### B) Table: `advisor_notes` (optional but allowed)
Only if the Parent Dashboard currently displays advisor notes.

Columns (minimal):
- `id` (uuid, PK)
- `advisor_id` (uuid)
- `student_id` (uuid)
- `message` (text)
- `created_at` (timestamp, default now)

Parents may **read** advisor notes for their students.
Parents may **not** create or edit notes.

If advisor notes are still demo-only and not required by the UI,
this table MAY be skipped in this slice.

---

### 2) Row Level Security (RLS)

Minimal, least-privilege rules:

#### Parent access
- Parents may read data **only for students linked to them**
  (via `students.parent_id` or equivalent relationship).

#### Student access
- Students have no additional access beyond existing slices.

#### Advisor access
- Advisors may read advisor_notes they authored (if implemented).
- No advisor dashboard summaries in this slice.

If relationship logic is ambiguous:
- Default to DENY
- Stop and report instead of guessing

---

### 3) Application Wiring (READ-ONLY)

Replace demo/hardcoded data in:

#### `ParentDashboard.tsx`
- Replace `performanceData`
- Replace `advisorNotes`
- Replace `notifications` (read-only display only if already present in UI)

Data must come from Supabase-backed views/tables defined above.

UI layout and styling must remain visually unchanged.

No new UI components.
No new interactions.

---

## Explicitly Out of Scope (Forbidden)

The following MUST NOT be implemented in Slice 6:

- Parent writes or edits of any data
- Notifications system (push/email/in-app)
- Parent task or assignment creation
- Parent-to-student messaging
- Advisor dashboard summaries (Slice 5)
- Gamification, points, or rewards
- UI redesign, layout changes, or new routes/pages
- Complex analytics or trend charts

If any of the above is required to proceed:
- STOP and report why

---

## Completion Criteria (All Required)

Slice 6 is complete only when ALL are true:

- Parent dashboard renders entirely from Supabase-backed data
- No demo or hardcoded parent data remains
- Parents see only their own students’ data
- RLS correctly enforces parent → student scoping
- Lint and build pass
- Slice 6 marked ✅ complete in `docs/data-realization-plan.md`
- Commit history includes:
  - one slice implementation commit
  - optional documentation-only commit to record the commit SHA

---

## Notes

This slice is intentionally read-only and summary-focused.
Its goal is to make the parent experience honest and coherent,
not interactive or fully featured.

Future slices may extend this with notifications or actions,
but Slice 6 must remain minimal.

# Slice 2 Scope — Skill Assignments (LOCKED)

Branch: lesson-45  
Status: scope locked — do not expand  
Depends on: Slice 1 (skill_modules)

---

## Purpose

Slice 2 turns the skills catalog created in Slice 1 into a real workflow by
persisting which skill modules are assigned to which students.

This slice introduces the minimum data and wiring required to replace
localStorage-backed assignments with Supabase-backed persistence.

---

## In Scope (Authoritative)

Slice 2 WILL implement the following:

### 1) Database

Create a new table:

**skill_assignments**

Minimum required columns only:
- `id` (uuid, primary key)
- `skill_module_id` (uuid, FK → skill_modules.id)
- `student_id` (uuid, FK → students.id)
- `assigned_by` (uuid, FK → profiles.id)
- `assigned_at` (timestamp, default now)
- `completed_at` (timestamp, nullable)

No additional columns unless strictly required for the existing UI to function.

All schema changes must be implemented via a new SQL migration.
Never edit existing migrations. Fix-forward only.

---

### 2) Row Level Security (RLS)

Minimal, least-privilege rules:

- **Insert**
  - Allowed for mentors/advisors assigning skills to students they are authorized to access

- **Select**
  - Allowed for:
    - the assigned student (`student_id`)
    - the assigning mentor/advisor (`assigned_by`)

- **Update**
  - Optional: student may set `completed_at`
  - No other updates required

- **Delete**
  - Not required in this slice

If access rules are ambiguous:
- Default to DENY
- Log a clear console error (no silent failures)

---

### 3) Application Wiring

Replace localStorage-backed skill assignments with Supabase-backed data in:

- `MentorSkills.tsx`
  - Assigning a skill inserts into `skill_assignments`
  - UI behavior must remain visually unchanged

- `StudentSkills.tsx`
  - Assigned skills are read from `skill_assignments`
  - UI behavior must remain visually unchanged

No new UI components.
No visual redesign.
No UX enhancements.

---

## Explicitly Out of Scope (Forbidden)

The following MUST NOT be implemented in Slice 2:

- Notifications (in-app, email, toast, etc.)
- Points, streaks, achievements, or gamification
- Editing or deleting assignments after creation
- Due dates, reminders, or progress tracking
- Parent access or parent dashboards
- Analytics, summaries, or rollups
- Batch or bulk assignment actions
- UI redesign, layout changes, or styling changes
- New routes or pages

If any of the above is required to proceed, the agent MUST stop and report why.

---

## Completion Criteria (All Required)

Slice 2 is complete only when ALL of the following are true:

- `skill_assignments` table exists via a new migration
- Assignments persist across refresh and re-login
- MentorSkills and StudentSkills use Supabase instead of localStorage
- No localStorage remains for skill assignments
- Lint and build pass
- Slice 2 is marked ✅ complete in `docs/data-realization-plan.md`
- Commit history includes:
  - one code/schema commit
  - optional documentation-only commit to record the commit SHA

---

## Notes

This slice is intentionally minimal and higher-risk than Slice 1.
Its purpose is to establish correct cross-user persistence and RLS,
not to deliver a complete workflow or polished UX.

Future slices will build on this foundation.

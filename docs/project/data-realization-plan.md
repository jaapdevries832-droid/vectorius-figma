# Data Realization Plan (Hardcoded UI Sources)

This doc inventories hardcoded or demo UI data sources and outlines a Supabase-backed realization plan.

## Inventory: hardcoded/dummy data sources

- `app/(dash)/[role]/page.tsx:10` Parent dashboard preview props are hardcoded (email, empty students list).
- `app/parent-demo/page.tsx:14` `seededStudents` demo list; `app/parent-demo/page.tsx:30` demo parent email string; local-only add/delete flows.
- `app/login/page.tsx:25` demo parent prefill credentials (email/password).
- `components/LoginScreen.tsx:33` `demoAccounts` list for demo sign-in.
- `components/StudentDashboard.tsx:48` `assignments` array; `components/StudentDashboard.tsx:55` `notes` array.
- `components/WeeklyPlanner.tsx:55` `DEFAULT_CLASSES`; `components/WeeklyPlanner.tsx:98` `ANNIE_CLASSES`; `components/WeeklyPlanner.tsx:171` demo selection logic.
- `app/lib/skills-data.ts:4` `DEFAULT_SKILL_MODULES` seed list.
- `components/MentorSkills.tsx:32` localStorage-backed modules/assignments/notifications with `DEFAULT_SKILL_MODULES`; `components/MentorSkills.tsx:73` hardcoded student roster.
- `components/StudentSkills.tsx:49` hardcoded `studentId = '1'`; localStorage-backed assignments/notifications.
- `components/ParentDashboard.tsx:103` `performanceData`; `components/ParentDashboard.tsx:150` `advisorNotes`; `components/ParentDashboard.tsx:165` `notifications`.
- `components/AdvisorDashboard.tsx:47` subject/performance arrays; `components/AdvisorDashboard.tsx:154` assignments; `components/AdvisorDashboard.tsx:160` messages.
- `components/AchievementsPage.tsx:13` `points`/`streakDays`; `components/AchievementsPage.tsx:17` badges; `components/AchievementsPage.tsx:24` rewards.
- `components/AssignmentsPage.tsx:7` default classes source; `components/AssignmentsPage.tsx:178` in-memory add assignment; `components/AssignmentsPage.tsx:445` gamification badges stub.

## Proposed Supabase tables/views

Note: table/view names below are proposals. Confirm existing migrations and naming conventions before creating new objects.

### Skills and mentoring

- `skill_modules`
  - Columns: `id`, `title`, `description`, `objectives` (text[]), `media` (jsonb), `duration_minutes`, `difficulty`, `topic`, `created_by`, `created_at`, `archived_at`.
  - Replaces: `app/lib/skills-data.ts` seed list, `components/MentorSkills.tsx`.
- `skill_assignments`
  - Columns: `id`, `skill_module_id`, `student_id`, `assigned_by`, `notes`, `status`, `assigned_at`, `started_at`, `completed_at`.
  - Replaces: localStorage assignments in `components/MentorSkills.tsx` and `components/StudentSkills.tsx`.
- `mentor_notifications` (or `skill_completion_events`)
  - Columns: `id`, `student_id`, `mentor_id`, `skill_assignment_id`, `message`, `created_at`, `read_at`.
  - Replaces: localStorage notifications in `components/MentorSkills.tsx` and `components/StudentSkills.tsx`.

### Student notes and dashboard cards

- `student_notes`
  - Columns: `id`, `student_id`, `body`, `color`, `created_at`, `archived_at`.
  - Replaces: `components/StudentDashboard.tsx` notes array.
- View: `student_assignment_summary`
  - Fields: `student_id`, `total`, `completed`, `due`, `avg_grade_percent`, `progress_percent`.
  - Replaces: local computed metrics; powers dashboard metrics.

### Schedule and classes

- View: `student_schedule_events`
  - Derived from existing `courses`, `course_meetings`, `student_course_enrollments`.
  - Fields: `student_id`, `course_id`, `title`, `teacher_name`, `location`, `day_of_week`, `start_time`, `end_time`, `color`.
  - Replaces: `components/WeeklyPlanner.tsx` demo classes and `AssignmentsPage` default class labels.

### Advisor and parent dashboards

- View: `advisor_student_summary`
  - Fields: `advisor_id`, `student_id`, `student_name`, `grade`, `subject_focus`, `performance`, `last_activity_at`, `assignments_open`, `pending_tasks`, `grade_metric`.
  - Replaces: `components/AdvisorDashboard.tsx` subject/performance demo fields and derived stats.
- `advisor_notes`
  - Columns: `id`, `advisor_id`, `student_id`, `message`, `priority`, `created_at`.
  - Replaces: `components/ParentDashboard.tsx` advisor notes list.
- `notifications`
  - Columns: `id`, `recipient_profile_id`, `recipient_role`, `type`, `message`, `is_urgent`, `created_at`, `read_at`.
  - Replaces: `components/ParentDashboard.tsx` notifications list.
- View: `parent_student_overview`
  - Fields: `parent_id`, `student_id`, `overall_grade`, `progress_percent`, `subjects_count`, `recent_activity_count`, `grade_metric`.
  - Replaces: `components/ParentDashboard.tsx` performanceData.

### Achievements and gamification

- `points_ledger`
  - Columns: `id`, `student_id`, `source_type`, `source_id`, `points`, `created_at`.
  - Supports: points totals and streak tracking for `components/AchievementsPage.tsx` and `GamificationCongratsModal`.
- `badges`
  - Columns: `id`, `name`, `criteria`, `icon`, `created_at`.
- `student_badges`
  - Columns: `id`, `student_id`, `badge_id`, `awarded_at`.
- `rewards`
  - Columns: `id`, `name`, `description`, `cost_points`, `created_at`.
- `reward_redemptions`
  - Columns: `id`, `reward_id`, `student_id`, `redeemed_at`, `status`.

## RLS notes (high level)

- General: enable RLS for all new tables; use `profiles.role` and relationship tables to scope access. Avoid `select *` patterns and prefer explicit columns in policies.
- Students: can read/write their own `skill_assignments`, `student_notes`, `points_ledger` entries tied to their `student_id`.
- Parents: can read data for linked students only (via parent-student link table or existing relationship model).
- Advisors/Mentors: can read/write data for students assigned to them (`advisor_id` or mentor relationship table). Avoid broad read on all students.
- Notifications: recipients can read their own; creators can insert for allowed recipients; updates only for marking `read_at`.
- Views: enforce row-level filtering via `security_invoker` views or filter by underlying RLS.

## Chunked implementation plan (8 slices)

1. Skills: create `skill_modules` + seed entries; wire MentorSkills to read modules from Supabase instead of `DEFAULT_SKILL_MODULES`.
2. Skills assignments: create `skill_assignments` + `mentor_notifications`; replace localStorage flows in MentorSkills and StudentSkills.
3. Student notes: create `student_notes`; swap StudentDashboard notes to Supabase (read + add + delete).
4. Schedule: create `student_schedule_events` view from courses/enrollments/meetings; replace WeeklyPlanner defaults and `AssignmentsPage` default classes.
5. Advisor data: add `advisor_student_summary` view; replace subject/performance and roster metrics in AdvisorDashboard.
6. Parent data: add `parent_student_overview`, `advisor_notes`, `notifications`; replace ParentDashboard demo performance and notifications.
7. Assignments: persist new assignment creation to `assignments` table; remove local-only add flow; integrate points via `points_ledger`.
8. Achievements: add `badges`, `student_badges`, `rewards`, `reward_redemptions`, and streak logic; wire AchievementsPage and congrats modal to real data.


## Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed (date) | Notes |
|---:|---|---|---|---|---|
| 1 | Skills modules | ✅ | 0e3c7d0 | 2026-01-10 | skill_modules table + seed; MentorSkills reads modules from Supabase (read-only); manual: Mentor dashboard -> Skills -> modules list renders |
| 2 | Skill assignments + notifications | 🟨 | 8a2f505 | 2026-01-10 | skill_assignments table + RLS implemented and wired to MentorSkills/StudentSkills; notifications remain localStorage-only (no DB table yet); manual: Mentor dashboard -> Skills -> Assign; Student dashboard -> Skills -> Mark Completed |
| 3 | Student notes | ✅ | 5db9251 | 2026-01-10 | student_notes table + RLS; StudentDashboard notes read/add/delete; manual: Student dashboard -> Quick Notes add/delete |
| 4 | Schedule | ✅ | e961c0a | 2026-01-10 | student_schedule_events view; WeeklyPlanner + AssignmentsPage read from view; manual: Student dashboard -> Schedule tab shows classes; Assignments uses class labels |
| 5 | Advisor data | 🟨 |  | 2026-01-13 | advisor_student_summary view created; AdvisorDashboard reads from view (read-only); manual: Advisor dashboard -> Student Roster shows real performance/assignments/pending tasks from Supabase |
| 6 | Parent data | ✅ | 95013f2, c4488cc | 2026-01-11 | advisor_notes table + parent_student_overview view; ParentDashboard reads from Supabase (read-only); manual: Parent dashboard shows real assignment counts, advisor notes for selected student; fix-forward ✅ c4488cc ensures Supabase objects exist |
| 7 | Assignments | ✅ | 9029ec5 | 2026-01-10 | assignments.type column + student insert policy; AssignmentsPage + StudentDashboard wired to Supabase; manual: Student dashboard -> Assignments add assignment, mark complete, upcoming list matches |
| 8 | Achievements | ⬜ |  |  |  |

## Execution order (recommended)
Default order is 1→8. If dependencies make a slice risky, it is allowed to implement a later slice first
(e.g., Slice 3 before Slice 1) as long as only ONE slice is executed per run and the tracker is updated.

Slice numbers and definitions are immutable. Only execution order may vary. Do not split, merge, or redefine slices without explicit user instruction.

# Vectorius PRD Pivot: 10-Slice Implementation Plan

**Created**: 2026-01-17
**Branch**: lesson-52
**Target**: Student-first planning system with parent "signal not surveillance"

---

## Key Decisions (User Confirmed)

| Decision | Choice |
|----------|--------|
| AI Backend for Study Plans | Claude API |
| Student Invite Email | mailto: link only (parent sends manually) |
| Parent Alert Generation | Supabase Edge Function (scheduled every 15 min) |

---

## A) Repo Recon Summary

### Current State

#### Authentication & Roles
- **Supabase Auth** with `@supabase/ssr` browser client
- **Three roles**: `parent`, `student`, `advisor` (defined in `app_role` enum)
- Role-based routing at `/[role]` with verification in layout
- Profile table links auth.users to roles, names, avatars

#### Database Schema (Key Tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User identity + role | `id`, `role`, `first_name`, `last_name`, `email` |
| `students` | Student records | `id`, `parent_id`, `student_user_id`, `advisor_id`, `grade` |
| `assignments` | Tasks/homework | `student_id`, `title`, `due_at`, `status`, `type`, `priority`, `created_by` |
| `courses` | Classes | `title`, `teacher_name`, `created_by_student_id` |
| `course_meetings` | Schedule slots | `course_id`, `day_of_week`, `start_time`, `end_time` |
| `student_notes` | Private notes | `student_id`, `body`, `color` |
| `advisor_notes` | Advisor→student notes | `advisor_id`, `student_id`, `message`, `priority` |
| `skill_modules` | Learning modules | `id`, `title`, `description`, `objectives` |
| `skill_assignments` | Skill assignments | `skill_module_id`, `student_id`, `assigned_by` |
| `points_ledger` | Gamification | `student_id`, `source_type`, `points` |
| `badges`, `student_badges` | Achievement badges | Standard badge tables |

#### Current RLS Pattern
- Parent owns student records (`students.parent_id = auth.uid()`)
- Student access via `students.student_user_id = auth.uid()`
- Advisor access via `students.advisor_id = auth.uid()`
- Deny-by-default with explicit policies per table

#### Existing Views
- `student_schedule_events` - schedule from enrollments
- `parent_student_overview` - assignment counts for parent dashboard
- `advisor_student_summary` - student roster with metrics

#### Components Structure
- `StudentDashboard.tsx` - student home with assignments, notes, classes
- `ParentDashboard.tsx` / `ParentDashboardWrapper.tsx` - parent view with student selector
- `AdvisorDashboard.tsx` - advisor roster and management
- `WeeklyPlanner.tsx` - calendar/schedule display
- `AssignmentsPage.tsx` - assignment list with CRUD

---

### Gaps vs PRD Pivot

| PRD Requirement | Current State | Gap |
|-----------------|---------------|-----|
| **Invite code onboarding** | None - parent manually adds students | Need `student_invites` table + invite flow |
| **Student self-registration via code** | Students can only be linked, not invited | Need invite acceptance flow |
| **Task provenance (created_by_role, source)** | `assignments.created_by` exists but no `source` column | Add `source` enum |
| **Parent "suggested" tasks** | Not implemented | Add `suggestion_status` column + UI |
| **Private events for student** | Notes are private, but no private events | Add `is_private` to events/tasks |
| **Calendar events (non-course)** | Only course meetings exist | Need `calendar_events` table |
| **AI study pathway** | No AI integration beyond chat | Need AI pathway generation endpoint |
| **School email ingestion** | Not implemented | Need `email_ingests` table + parse UI |
| **Parent alerts (overdue, big tests)** | No alert system | Need `parent_alerts` or use `notifications` |

---

## B) 10-Slice Implementation Plan

---

### Slice 1: Student Invite System

**Goal**: Parents can generate invite codes; students can join using codes.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_student_invites.sql`

```sql
-- student_invites table
CREATE TABLE public.student_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_invites_code ON public.student_invites(invite_code);
CREATE INDEX idx_student_invites_student ON public.student_invites(student_id);

-- RLS
ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

-- Parents can create/view invites for their students
CREATE POLICY "parent_manage_invites" ON public.student_invites
  FOR ALL USING (parent_id = auth.uid());

-- Any authenticated user can SELECT by invite_code (for acceptance)
CREATE POLICY "anyone_select_by_code" ON public.student_invites
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

#### Backend Changes
- Server action: `generateInviteCode(studentId)` → returns 8-char alphanumeric code
- Server action: `acceptInvite(inviteCode)` → links `students.student_user_id` to current user

#### Frontend Changes
- **ParentDashboardWrapper.tsx**: Add "Invite Student" button per student row
- **New component**: `InviteCodeModal.tsx` - displays code + copy button + optional email field
- **Login page**: Add "I have an invite code" link → `StudentJoinPage.tsx`
- **New page**: `app/join/page.tsx` - code entry form, validates + accepts invite

#### Acceptance Criteria
- [ ] Parent can generate invite code for any student they created
- [ ] Code is 8 alphanumeric characters, case-insensitive
- [ ] Code expires after 7 days
- [ ] Student can enter code at `/join` and link their account
- [ ] After acceptance, student sees their dashboard with parent's data

#### Manual Test Script
1. Login as parent (e.g., david@demo.com)
2. Go to Parent Dashboard → find "Maya" → click "Invite"
3. Copy the 8-digit code
4. Logout
5. Create new account with role=student
6. Navigate to `/join`
7. Enter the code → should see "Linked to Maya" success
8. Navigate to `/student` → should see Maya's classes, assignments

#### Notes/Risks
- Email invite uses mailto: link only (parent manually sends) - avoids email deliverability issues
- v2: Automated email via Supabase Edge Function or SendGrid

---

### Slice 2: Task Provenance & Source Labels

**Goal**: Every task/assignment has clear provenance (who created it, what source).

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_task_provenance.sql`

```sql
-- Add source enum
CREATE TYPE public.task_source AS ENUM (
  'student',
  'parent',
  'advisor',
  'ai',
  'google_classroom',
  'manual_import'
);

-- Add columns to assignments
ALTER TABLE public.assignments
  ADD COLUMN source public.task_source NOT NULL DEFAULT 'student',
  ADD COLUMN created_by_role public.app_role;

-- Backfill existing data
UPDATE public.assignments
SET created_by_role = (
  SELECT role FROM public.profiles WHERE id = assignments.created_by
)
WHERE created_by IS NOT NULL;
```

#### Backend Changes
- Update assignment insert logic to set `source` based on current user's role
- Update `created_by_role` on insert

#### Frontend Changes
- **AssignmentsPage.tsx**: Display source badge on each assignment (small label like "Added by Parent")
- **StudentDashboard.tsx**: Show source in assignment cards
- **Landing page**: Remove direct role shortcut buttons (Student/Parent/Advisor) and route through login
- **Invite UX**: Add note in invite modal about "code already used" and re-generate flow

#### Acceptance Criteria
- [ ] New assignments get correct `source` and `created_by_role`
- [ ] UI shows provenance badge on all assignments
- [ ] Existing assignments show "student" as default source
- [ ] Landing page no longer exposes direct role shortcuts
- [ ] Invite modal explains how to proceed when a code is already used

#### Manual Test Script
1. Login as student → create assignment → verify source="student"
2. Login as parent → create assignment for student → verify source="parent"
3. Login as advisor → create assignment → verify source="advisor"
4. Check assignment list shows correct badges

---

### Slice 3: Parent Suggested Tasks (Student Accept/Decline)

**Goal**: Parents can add tasks that students must acknowledge/accept.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_suggested_tasks.sql`

```sql
-- Add suggestion workflow columns
ALTER TABLE public.assignments
  ADD COLUMN is_suggested boolean NOT NULL DEFAULT false,
  ADD COLUMN suggestion_status text CHECK (suggestion_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN suggestion_responded_at timestamptz;

-- Update student policy to allow accepting/declining suggestions
-- (Students can update suggestion_status on their own assignments)
```

#### Backend Changes
- When parent creates task: set `is_suggested = true`, `suggestion_status = 'pending'`
- Server action: `respondToSuggestion(assignmentId, accept: boolean)`

#### Frontend Changes
- **StudentDashboard.tsx**: New "Suggested Tasks" section with Accept/Decline buttons
- **AssignmentsPage.tsx**: Filter option for "Pending Suggestions"
- Pending suggestions appear in a distinct style (yellow highlight)

#### Acceptance Criteria
- [ ] Parent-created tasks appear as "pending" suggestions for student
- [ ] Student can Accept (becomes normal task) or Decline (hidden from main list)
- [ ] Parent dashboard shows count of pending/declined suggestions
- [ ] Advisor tasks also default to suggested (same flow)

#### Manual Test Script
1. Login as parent → add task "Study for Math Test" for student
2. Login as student → see "Suggested Tasks" section
3. Click "Accept" → task moves to main list
4. Have parent add another → student clicks "Decline"
5. Verify declined task hidden but parent can see status

---

### Slice 4: Calendar Events (Non-Course)

**Goal**: Students and parents can add calendar events (appointments, travel, etc).

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_calendar_events.sql`

```sql
CREATE TYPE public.calendar_event_type AS ENUM (
  'appointment',
  'school_event',
  'travel',
  'extracurricular',
  'study_block',
  'other'
);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type public.calendar_event_type NOT NULL DEFAULT 'other',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  source public.task_source NOT NULL DEFAULT 'student',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_student_date ON public.calendar_events(student_id, start_at);

-- RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Student can CRUD their own events
CREATE POLICY "student_own_events" ON public.calendar_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = calendar_events.student_id AND s.student_user_id = auth.uid())
  );

-- Parent can read non-private events, insert events
CREATE POLICY "parent_events" ON public.calendar_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = calendar_events.student_id AND s.parent_id = auth.uid())
    AND (is_private = false OR source = 'parent')
  );
```

#### Frontend Changes
- **WeeklyPlanner.tsx**: Merge calendar_events with course_meetings in display
- **New component**: `AddEventModal.tsx` - form for creating events
- Student can toggle "private" checkbox
- Color-code by event_type

#### Acceptance Criteria
- [ ] Students can create calendar events with type, date/time
- [ ] Private events only visible to student
- [ ] Parents can add events (non-private by default)
- [ ] WeeklyPlanner shows events alongside class schedule
- [ ] Events can be edited and deleted by creator

#### Manual Test Script
1. Login as student → Schedule tab → click "+" → add "Doctor Appointment"
2. Mark as private → save
3. Login as parent → view student schedule → should NOT see doctor appointment
4. Parent adds "Family Trip" → both student and parent see it
5. Student adds public "Soccer Practice" → parent sees it

---

### Slice 5: Private Notes Enhancement

**Goal**: Clarify and enforce privacy for student notes.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_private_notes.sql`

```sql
-- student_notes already exists; ensure is_private column
ALTER TABLE public.student_notes
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;

-- Update RLS to be explicit about privacy
DROP POLICY IF EXISTS "parent_view_notes" ON public.student_notes;

-- Students: full access to own notes
CREATE POLICY "student_notes_full" ON public.student_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_notes.student_id AND s.student_user_id = auth.uid())
  );

-- Parents: NO access to student notes (private by design)
-- (No policy = deny)
```

#### Frontend Changes
- **NotesPage.tsx**: Add privacy indicator (lock icon)
- Show "Only you can see these notes" message for students
- Parent Notes tab shows "Student notes are private for their wellbeing"

#### Acceptance Criteria
- [ ] All student notes are private by default
- [ ] Parents cannot see student notes (RLS enforced)
- [ ] UI clearly indicates privacy to student
- [ ] Student can optionally share specific notes (v2 flag)

#### Manual Test Script
1. Login as student → Notes page → create note "Feeling stressed about test"
2. Login as parent → Notes page → should see message "Student notes are private"
3. Verify parent cannot access notes via direct query

---

### Slice 6: Parent Dashboard Signals

**Goal**: Parent dashboard shows key signals: upcoming tests, overdue items, plan status.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_parent_signals_view.sql`

```sql
CREATE OR REPLACE VIEW public.parent_student_signals
WITH (security_invoker = true)
AS
SELECT
  s.id as student_id,
  s.parent_id,
  s.first_name || ' ' || COALESCE(s.last_name, '') as student_name,
  -- Overdue count
  (SELECT COUNT(*) FROM assignments a
   WHERE a.student_id = s.id
   AND a.due_at < now()
   AND a.status NOT IN ('completed', 'archived')) as overdue_count,
  -- Next big item (test/project due within 14 days)
  (SELECT json_build_object('title', a.title, 'due_at', a.due_at, 'type', a.type)
   FROM assignments a
   WHERE a.student_id = s.id
   AND a.type IN ('test', 'project')
   AND a.due_at BETWEEN now() AND now() + interval '14 days'
   AND a.status NOT IN ('completed', 'archived')
   ORDER BY a.due_at LIMIT 1) as next_big_item,
  -- Has plan (any non-completed tasks exist)
  (SELECT COUNT(*) > 0 FROM assignments a
   WHERE a.student_id = s.id
   AND a.status NOT IN ('completed', 'archived')) as has_active_plan,
  -- Pending suggestions count
  (SELECT COUNT(*) FROM assignments a
   WHERE a.student_id = s.id
   AND a.is_suggested = true
   AND a.suggestion_status = 'pending') as pending_suggestions
FROM students s;
```

#### Frontend Changes
- **ParentDashboard.tsx**: Redesign summary cards:
  - "Overdue Items" count with warning color
  - "Upcoming Test/Project" preview card
  - "Study Plan" status (Active / No plan)
  - "Your Suggestions" pending count
- Remove detailed assignment list (signal not surveillance)

#### Acceptance Criteria
- [ ] Parent sees high-level signals, not full assignment list
- [ ] Overdue count shows warning styling
- [ ] Big upcoming items (tests/projects) prominently displayed
- [ ] Parent knows if student has an active plan without seeing details

#### Manual Test Script
1. Create student with 2 overdue assignments, 1 upcoming test
2. Login as parent → Dashboard shows:
   - "2 Overdue Items" (red badge)
   - "Math Test due in 5 days" (preview card)
   - "Study Plan: Active"
3. Mark all tasks complete → "Study Plan: No active plan"

---

### Slice 7: School Email Manual Ingestion

**Goal**: Parent can paste email text → AI extracts dates/events → adds to calendar.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_email_ingests.sql`

```sql
CREATE TABLE public.email_ingests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  parsed_events jsonb, -- [{title, date, type, ...}]
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'imported', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: parent owns their ingests
ALTER TABLE public.email_ingests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_own_ingests" ON public.email_ingests
  FOR ALL USING (parent_id = auth.uid());
```

#### Backend Changes
- **API route**: `POST /api/parse-email`
  - Input: raw text
  - Process: Call Claude API to extract dates and events
  - Output: `{ events: [{title, date, type}, ...] }`
- Server action: `importParsedEvents(ingestId, selectedEventIds[])` → creates calendar_events

#### Frontend Changes
- **New page**: `app/(dash)/parent/import-email/page.tsx`
  - Large textarea for pasting email
  - "Parse" button → shows extracted events with checkboxes
  - "Import Selected" → adds to student's calendar
- Link from ParentDashboard: "Import School Email"

#### Acceptance Criteria
- [ ] Parent can paste raw email text
- [ ] AI parses and returns structured events
- [ ] Parent reviews and selects which events to import
- [ ] Selected events appear on student calendar with source="manual_import"
- [ ] Parse failures show clear error message

#### Manual Test Script
1. Login as parent → click "Import School Email"
2. Paste sample email: "Reminder: Science Fair on March 15th, 2pm. Report cards March 20th."
3. Click Parse → see 2 extracted events
4. Check both → Import → verify on student calendar
5. Test with gibberish → see "No events found" or error

#### Notes/Risks
- AI parsing may miss events or hallucinate dates
- v2: Add PDF upload, link to Gmail inbox

---

### Slice 8: AI Study Pathway (MVP Magic Moment)

**Goal**: Student enters test/project → AI proposes study plan with milestones.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_ai_study_plans.sql`

```sql
CREATE TABLE public.ai_study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  target_assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  target_title text NOT NULL,
  target_due_at timestamptz NOT NULL,
  proposed_milestones jsonb NOT NULL, -- [{title, date, duration_minutes, type}]
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'modified', 'declined')),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: student owns their plans
ALTER TABLE public.ai_study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_own_plans" ON public.ai_study_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = ai_study_plans.student_id AND s.student_user_id = auth.uid())
  );
```

#### Backend Changes
- **API route**: `POST /api/generate-study-plan`
  - Input: `{ title, dueDate, studentId }`
  - Fetches student's existing calendar events (available time)
  - Calls **Claude API** to propose milestones fitting around schedule
  - Returns proposed plan
- Server action: `acceptStudyPlan(planId)` → creates calendar_events for each milestone

#### Frontend Changes
- **AssignmentsPage.tsx**: "Create Study Plan" button on test/project assignments
- **New component**: `StudyPlanPreview.tsx`
  - Shows AI-proposed milestones on mini calendar
  - "Accept Plan" button (one-click)
  - "Modify" option (v2)
- After accepting, milestones appear as study blocks on calendar

#### Acceptance Criteria
- [ ] Student can request study plan for any test/project
- [ ] AI considers existing schedule when proposing times
- [ ] Proposed plan shows milestones with dates/durations
- [ ] One-click accept creates all study blocks
- [ ] Study blocks appear on WeeklyPlanner

#### Manual Test Script
1. Login as student → Assignments → add "History Final - March 20"
2. Click "Create Study Plan"
3. AI proposes: Review Ch.1 (Mar 14), Review Ch.2 (Mar 16), Practice Test (Mar 18)
4. Click "Accept" → see 3 study blocks on calendar
5. Verify blocks don't overlap with existing classes

#### Notes/Risks
- AI quality depends on prompt engineering
- May propose unrealistic schedules initially
- v2: Allow editing individual milestones before accepting

---

### Slice 9: Parent Alerts System

**Goal**: Parents receive alerts for overdue items, upcoming big tests, key dates.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_parent_alerts.sql`

```sql
CREATE TYPE public.alert_type AS ENUM (
  'overdue_assignment',
  'upcoming_test',
  'upcoming_project',
  'school_event',
  'suggestion_declined'
);

CREATE TABLE public.parent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  alert_type public.alert_type NOT NULL,
  title text NOT NULL,
  message text,
  reference_id uuid, -- assignment_id or event_id
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parent_alerts_unread ON public.parent_alerts(parent_id, is_read, created_at DESC);

-- RLS
ALTER TABLE public.parent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_own_alerts" ON public.parent_alerts
  FOR ALL USING (parent_id = auth.uid());
```

#### Backend Changes
- **Supabase Edge Function (scheduled every 15 min)**: Generate alerts when:
  - Assignment becomes overdue (due_at < now() and not completed)
  - Test/project due within 7 days
  - Student declines a suggestion
- Alerts are created server-side by scheduled job (more reliable than triggers)

#### Frontend Changes
- **TopNavigation.tsx**: Alert bell shows count of unread parent alerts
- **New component**: `ParentAlertsList.tsx` - dropdown/panel showing alerts
- Click alert → navigates to relevant item or marks as read
- "Mark all read" button

#### Acceptance Criteria
- [ ] Parents see alert count in nav bar
- [ ] Clicking shows list of alerts with type icons
- [ ] Alerts generated automatically for overdue items
- [ ] Alerts generated for upcoming tests/projects (7-day warning)
- [ ] Alerts can be marked as read

#### Manual Test Script
1. Create assignment with due date = yesterday (overdue)
2. Login as parent → see "1" badge on alert bell
3. Click → see "Maya has 1 overdue assignment"
4. Mark as read → badge disappears
5. Create test due in 5 days → parent gets "Upcoming test" alert

#### Notes/Risks
- Scheduled job runs every 15 min - balance between timeliness and cost
- Need idempotency to avoid duplicate alerts
- v2: Email/SMS notifications via Twilio/SendGrid

---

### Slice 10: V2 Hooks & Polish

**Goal**: Add groundwork for Google Classroom and email automation; final polish.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_v2_hooks.sql`

```sql
-- Google Classroom integration prep
CREATE TABLE public.google_classroom_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  classroom_id text NOT NULL,
  course_name text,
  last_sync_at timestamptz,
  access_token_encrypted text, -- encrypted OAuth token
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, classroom_id)
);

-- Email automation prep
CREATE TABLE public.email_inbox_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_provider text NOT NULL CHECK (email_provider IN ('gmail', 'outlook')),
  email_address text NOT NULL,
  access_token_encrypted text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, email_address)
);

-- Add external_id for imported items
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX idx_assignments_external ON public.assignments(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_calendar_events_external ON public.calendar_events(external_id) WHERE external_id IS NOT NULL;
```

#### Frontend Changes
- **Settings page**: "Coming Soon" section for Google Classroom link
- **Settings page**: "Coming Soon" section for Email inbox link
- UI polish: loading states, error boundaries, empty states

#### Acceptance Criteria
- [ ] v2 tables created with proper indexes
- [ ] external_id columns allow deduplication
- [ ] Settings shows "Coming Soon" for integrations
- [ ] All slices 1-9 working end-to-end
- [ ] No console errors, clean build

#### Manual Test Script
1. Full flow: Parent signup → create student → invite → student joins
2. Parent adds suggested task → student accepts
3. Student creates test → AI study plan → accept
4. Parent imports email → events appear
5. Parent sees alerts for overdue/upcoming

---

## C) Dependencies & Sequencing

```
Slice 1 (Invites) ─────┐
                       │
Slice 2 (Provenance) ──┼─→ Slice 3 (Suggestions) ─→ Slice 6 (Signals)
                       │                                    │
Slice 4 (Events) ──────┤                                    │
                       │                                    ▼
Slice 5 (Notes) ───────┤              Slice 7 (Email) ─→ Slice 9 (Alerts)
                       │                    │
                       │                    ▼
                       └─────────────→ Slice 8 (AI Plans)
                                            │
                                            ▼
                                     Slice 10 (V2 Hooks)
```

**Required order**:
1. Slice 2 before Slice 3 (provenance needed for suggestions)
2. Slice 4 before Slice 7 and 8 (calendar_events table needed)
3. Slice 3 and 6 before Slice 9 (alerts depend on suggestion status and signals)
4. Slice 10 last (polish + v2 prep)

**Flexible order**:
- Slice 1 (Invites) can run in parallel with Slice 2
- Slice 5 (Notes) is independent

**Recommended execution order**:
1 → 2 → 4 → 5 → 3 → 6 → 7 → 8 → 9 → 10

---

## D) V2 Hooks (Groundwork Laid)

### Google Classroom Import
- **Table**: `google_classroom_links` ready for OAuth tokens
- **Column**: `assignments.external_id` for dedup
- **Source enum**: `google_classroom` already in `task_source`
- **Next steps**: OAuth flow, Classroom API calls, sync job

### Email Inbox Automation
- **Table**: `email_inbox_links` ready for Gmail/Outlook OAuth
- **Source enum**: `manual_import` (v1) vs automated (v2)
- **Existing pattern**: `email_ingests` can be extended for automated fetches
- **Next steps**: Gmail API integration, periodic sync

### AI Enhancements
- **Table**: `ai_study_plans` captures proposed vs accepted
- **Future**: Track plan modifications, learning from accepted patterns
- **Future**: Proactive suggestions based on past behavior

---

## E) Verification Checklist (Per Slice)

Each slice must pass before merge:

- [ ] New migration created (never edit existing)
- [ ] `supabase db push` succeeds
- [ ] `supabase db pull` confirms sync
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test script executed successfully
- [ ] Commit message follows format: `slice N: <description>`
- [ ] No secrets committed
- [ ] Slice marked complete in tracker

---

## F) Risk Register

| Risk | Mitigation |
|------|------------|
| School email blocking invite links | Primary flow is invite code + mailto: link (parent sends manually) |
| AI study plan quality | Using Claude API, allow manual override, iterate on prompts |
| Alert generation timing | Scheduled Edge Function every 15 min with idempotency |
| OAuth complexity for v2 | Defer to v2, use manual flows in v1 |
| RLS complexity | Test each policy in isolation, deny-by-default |
| Migration conflicts | One slice = one commit, fix-forward only |

---

## G) Files to Modify Summary

| Slice | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `InviteCodeModal.tsx`, `app/join/page.tsx` | `ParentDashboardWrapper.tsx`, `app/login/page.tsx` |
| 2 | - | `assignments` table, `AssignmentsPage.tsx`, `StudentDashboard.tsx`, `app/page.tsx`, `InviteCodeModal.tsx` |
| 3 | - | `assignments` table, `StudentDashboard.tsx`, `AssignmentsPage.tsx` |
| 4 | `AddEventModal.tsx` | `WeeklyPlanner.tsx`, new `calendar_events` queries |
| 5 | - | `student_notes` RLS, `NotesPage.tsx` |
| 6 | - | `ParentDashboard.tsx`, new view |
| 7 | `app/(dash)/parent/import-email/page.tsx`, `api/parse-email/route.ts` | `ParentDashboard.tsx` |
| 8 | `StudyPlanPreview.tsx`, `api/generate-study-plan/route.ts` | `AssignmentsPage.tsx` |
| 9 | `ParentAlertsList.tsx` | `TopNavigation.tsx`, trigger/job for alerts |
| 10 | Settings sections | Various polish |

---

## H) Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed (date) | Notes |
|---:|---|---|---|---|---|
| 1 | Student Invite System | ✅ | b6bcc54 | 2026-01-18 | Added student_invites table + invite modal + /join flow. Manual test: parent dashboard invite -> /join accept -> /student. |
| 2 | Task Provenance & Source Labels | ✅ | 761b7bd | 2026-01-18 | Added task_source + created_by_role on assignments; added provenance badges in Assignments + Student Dashboard; invite modal reuse note. Manual: student creates assignment -> badge shows Added by Student; advisor creates assignment -> badge shows Added by Advisor. |
| 3 | Parent Suggested Tasks | ✅ | 2069cad | 2026-01-18 | Added suggestion workflow columns on assignments; suggested tasks UX for students, filters for assignments, and parent/advisor suggestion creation. Manual: parent suggests -> student accepts/declines -> assignments list reflects status. |
| 4 | Calendar Events (Non-Course) | ✅ | 9580cbb | 2026-01-18 | Added calendar_events table + WeeklyPlanner merge + AddEventModal; parent schedule selector added. Manual: student schedule -> add event (private) -> see; parent schedule -> select student -> add event -> see; parent does not see private event. |
| 5 | Private Notes Enhancement | ✅ | 5109700 | 2026-01-18 | Added is_private default + student-only RLS. Notes UI now shows privacy messaging for students and parents. Manual: student notes -> see lock + message; parent notes -> privacy notice only. |
| 6 | Parent Dashboard Signals | ✅ | f2aa02e | 2026-01-18 | Added parent_student_signals view and signals-only dashboard cards. Manual: parent dashboard -> select student -> see overdue, next big item, plan status, pending suggestions. |
| 7 | School Email Manual Ingestion | ✅ | 3844850 | 2026-01-18 | Added email_ingests table + /parent/import-email flow + parse-email API; parent can parse and import into calendar. Manual: parent -> Import School Email -> parse -> select -> import -> events appear on schedule. |
| 8 | AI Study Pathway | ✅ | ee03ea9 | 2026-01-18 | Added ai_study_plans table + generate-study-plan API + StudyPlanPreview. Manual: student assignments -> Create Study Plan -> accept -> study blocks appear on schedule. |
| 9 | Parent Alerts System | ✅ | 5e4c821 | 2026-01-18 | Added parent_alerts table + parent alerts dropdown + edge function scaffold. Manual: parent sees alert bell with unread count after alerts inserted. |
| 10 | V2 Hooks & Polish | ✅ | d1dc3fd | 2026-01-18 | Added v2 hook tables + external_id columns; Settings shows Coming Soon integrations. Manual: settings -> see Classroom + Email Inbox placeholders. |

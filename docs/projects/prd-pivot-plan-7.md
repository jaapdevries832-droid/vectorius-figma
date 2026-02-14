# Vectorius PRD Pivot Plan 7: Parent Dashboard Overhaul

**Created**: 2026-02-14
**Branch**: `lesson-56` -> slices committed on `lesson-56`
**Target**: Major parent dashboard improvements -- cleanup redundant UI, expand Settings, add parent notes, schedule sharing, grade management, hover pop-ups, and image downsampling.

---

## Context

The parent dashboard has accumulated redundant sections (Parent Essentials card duplicates header info; Signals & Actions card duplicates the top signal cards), management actions (add student, advisor assignment, invite codes) are scattered across the dashboard instead of being centralized in Settings, the Notes page is read-only for parents, schedule events aren't shared across roles, there's no way to enter historical grades, and uploaded images hit the AI endpoint at full resolution (~8MB max) instead of being downsampled.

This PRD addresses 14 requirements grouped into 11 autonomous slices.

---

## Key Changes Summary

- **Dashboard cleanup**: Dynamic student name in header, remove Parent Essentials card, remove Signals & Actions card, simplify "Your Students" card
- **Settings expansion**: New `ParentSettingsPage` with Add Student form, advisor assignment, invite codes
- **Parent notes**: New `parent_notes` table + write UI in NotesPage for parents
- **Schedule sharing**: Parent-created events become visible to linked students/advisors via RLS
- **Hover pop-ups**: Tooltip popovers on the 4 signal cards
- **Classes/grades card**: New dashboard card showing enrolled classes with grade averages
- **Grade entry**: New `grading_periods` + `semester_grades` tables + entry UI
- **Class archiving**: `archived_at` column on courses
- **Image downsampling**: Client-side canvas compression to ~1MB before upload

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Parent notes table | Separate `parent_notes` table | Keeps parent/advisor/student note semantics distinct. `advisor_notes` has different RLS and semantics. |
| Schedule sharing | RLS policy on `calendar_events` | Events already have `created_by`, `is_private`, `source` fields. Just need RLS to allow students to see parent events. |
| Settings page | New `ParentSettingsPage.tsx` component | Settings is currently a shared placeholder. Parent needs custom sections. |
| Image downsampling | Client-side canvas resize | No server dependency; runs before upload; targets ~1MB via progressive quality reduction. |
| Grade entry | New `grading_periods` + `semester_grades` tables | No existing grades table. Assignment scores are per-assignment, not per-semester. Need separate structure for report-card-style grades. |
| Class archiving | `archived_at` column on `courses` | Soft-delete pattern consistent with `chat_attachments.deleted_at`. Reversible. |

---

## A) Gaps to Address

| # | Gap | Location | Priority |
|---|-----|----------|----------|
| 1 | "Student Overview" is static text, not dynamic | `ParentDashboard.tsx:156` | Must Fix |
| 2 | Parent Essentials card duplicates header info | `ParentDashboard.tsx:313-430` | Must Fix |
| 3 | Signals & Actions card duplicates top cards | `ParentDashboard.tsx:432-478` | Must Fix |
| 4 | "Linked" button redundant with "Linked to student account" text | `ParentDashboard.tsx:519-528` | Should Fix |
| 5 | Add Student form on dashboard, not in Settings | `ParentDashboard.tsx:345-427` | Must Fix |
| 6 | Advisor assignment on dashboard, not in Settings | `ParentDashboard.tsx:539-581` | Must Fix |
| 7 | Parent Notes page is read-only | `NotesPage.tsx:660-738` | Must Fix |
| 8 | Parent schedule events not visible to student/advisor | Calendar events RLS | Must Fix |
| 9 | No hover details on signal cards | `ParentDashboard.tsx:200-308` | Should Fix |
| 10 | No classes/grades overview card | Dashboard layout | Should Fix |
| 11 | No way to enter historical grades | No schema or UI | Should Fix |
| 12 | No class archiving | `courses` table lacks `archived_at` | Should Fix |
| 13 | Images uploaded at full resolution to AI | `ChatInterface.tsx`, `ParentChatInterface.tsx` | Must Fix |

---

## B) Implementation Plan

### Phase 1: Dashboard Cleanup (S7-A, S7-B)

---

### Slice S7-A: Dashboard header -- dynamic student name + layout cleanup

**Goal**: Replace static "Student Overview" title with the selected student's name. Keep student selector in the header. Remove the sign-out button from the header (it lives in TopNavigation dropdown already).

**Issues Addressed**: #1

#### Files to Modify

| File | Action |
|------|--------|
| `components/ParentDashboard.tsx` | MODIFY |

#### Changes

1. Replace `<h1>Student Overview</h1>` (line 156) with dynamic text:
   - If a student is selected: `"{firstName} {lastName}"` + subtitle `"Grade {grade} - Overview"`
   - If no student: `"Select a Student"`
2. Remove the sign-out button from the header area (lines 188-196) -- sign-out is accessible via TopNavigation dropdown.
3. Keep the student selector dropdown in the header as-is.

#### Acceptance Criteria

- [ ] Header shows selected student's full name as the page title
- [ ] Subtitle shows grade level
- [ ] Switching students updates the header immediately
- [ ] No student selected shows "Select a Student"
- [ ] Sign-out button removed from header (still in TopNav dropdown)
- [ ] `npm run build` passes

---

### Slice S7-B: Remove redundant cards + simplify "Your Students"

**Goal**: Remove Parent Essentials card and Signals & Actions card from the dashboard. Simplify the "Your Students" sidebar card to be read-only (remove advisor assignment, move invite to Settings). Fix the redundant "Linked" button.

**Issues Addressed**: #2, #3, #4, #6

#### Files to Modify

| File | Action |
|------|--------|
| `components/ParentDashboard.tsx` | MODIFY |
| `components/ParentDashboardWrapper.tsx` | MODIFY |

#### Changes

**ParentDashboard.tsx:**
1. Delete the Parent Essentials card (lines 312-430 approx).
2. Delete the Signals & Actions card (lines 432-478 approx).
3. Restructure the grid: the left column (currently empty after removal) gets the Advisor Notes card. The right column keeps "Your Students" card.
4. In "Your Students" card:
   - Remove the advisor assignment `<Select>` and related UI (lines 539-581).
   - Remove the "Invite" / disabled "Linked" button (lines 519-528).
   - When `isLinked` is true, show a small green checkmark icon + "Linked" badge. When false, show nothing (invite is in Settings now).
   - Keep the "Delete" button for quick removal.
5. Remove now-unused props from `ParentDashboardProps`: `email`, `onAddStudent`, `firstName`, `lastName`, `grade`, `onFirstNameChange`, `onLastNameChange`, `onGradeChange`, `isSaving`, `formError`, `loadError`, `advisors`, `showAdvisorAssignments`, `advisorLoadError`, `isAdvisorsLoading`, `assigningStudentId`, `assignmentStatusByStudentId`, `onAssignAdvisor`, `onInviteStudent`, `onSuggestAssignment`.

**ParentDashboardWrapper.tsx:**
1. Remove props that are no longer passed to `<ParentDashboard>`.
2. Keep all state and handlers that are still needed (students, selectedStudentId, signals, advisorNotes, gradeMetrics, handleDeleteStudent, handleSignalCardClick).
3. Keep fetchAdvisors, fetchStudents, etc. -- they'll be needed when Settings is wired up.

#### Acceptance Criteria

- [ ] Parent Essentials card no longer renders
- [ ] Signals & Actions card no longer renders
- [ ] "Your Students" card shows student name, grade, grade metric, linked badge, delete button only
- [ ] Advisor Notes card moved to left column
- [ ] No TypeScript errors from removed props
- [ ] `npm run build` passes

---

### Phase 2: Settings Expansion (S7-C)

---

### Slice S7-C: Parent Settings page

**Goal**: Create a dedicated `ParentSettingsPage` component with three sections: Add Student, Manage Students (advisor assignment + invite codes), and Account. Wire it into the layout for parent role.

**Issues Addressed**: #5, #6

#### Files to Modify/Create

| File | Action |
|------|--------|
| `components/ParentSettingsPage.tsx` | CREATE |
| `app/(dash)/[role]/layout.tsx` | MODIFY |

#### Changes

**New `components/ParentSettingsPage.tsx`:**
- Self-contained component that manages its own state (like ParentDashboardWrapper does for the dashboard).
- Fetches user profile, students, advisors on mount.
- **Section 1: Add Student** -- the form from old Parent Essentials (first name, last name, grade selector, submit).
- **Section 2: Manage Students** -- list of students with:
  - Advisor assignment dropdown per student (using advisors from `profiles` table).
  - Invite button per student (opens InviteCodeModal).
  - Shows "Linked" status with green badge for linked students.
- **Section 3: Account** -- signed-in-as email, Import School Email link.
- Uses existing validation functions from `@/lib/validation`.
- Uses existing `InviteCodeModal` component.

**Modify `app/(dash)/[role]/layout.tsx`:**
- Import `ParentSettingsPage`.
- In the `renderContent` switch case for `'settings'`, check if `role === 'parent'` and render `<ParentSettingsPage />` instead of the shared settings placeholder.

#### Acceptance Criteria

- [ ] Navigating to Settings as parent shows the new ParentSettingsPage
- [ ] Add Student form works (creates student, refreshes list)
- [ ] Advisor assignment works per student
- [ ] Invite code generation works
- [ ] Student/advisor roles still see the original settings placeholder
- [ ] `npm run build` passes

---

### Phase 3: Parent Notes (S7-D, S7-E)

---

### Slice S7-D: Schema -- `parent_notes` table

**Goal**: Create a `parent_notes` table for notes written by parents to students and/or advisors.

**Issues Addressed**: #7

#### DB Changes

**New migration**: `supabase migration new parent_notes`

```sql
CREATE TABLE IF NOT EXISTS parent_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'both'
    CHECK (recipient_type IN ('student', 'advisor', 'both')),
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parent_notes_parent ON parent_notes(parent_user_id);
CREATE INDEX idx_parent_notes_student ON parent_notes(student_id);

ALTER TABLE parent_notes ENABLE ROW LEVEL SECURITY;

-- Parents can CRUD their own notes
CREATE POLICY "parents_crud_own_notes" ON parent_notes
  FOR ALL USING (auth.uid() = parent_user_id);

-- Students can read notes addressed to them
CREATE POLICY "students_read_parent_notes" ON parent_notes
  FOR SELECT USING (
    recipient_type IN ('student', 'both')
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = parent_notes.student_id
        AND s.student_user_id = auth.uid()
    )
  );

-- Advisors can read notes for their assigned students
CREATE POLICY "advisors_read_parent_notes" ON parent_notes
  FOR SELECT USING (
    recipient_type IN ('advisor', 'both')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN profiles p ON p.id = s.advisor_id
      WHERE s.id = parent_notes.student_id
        AND p.user_id = auth.uid()
        AND p.role = 'advisor'
    )
  );
```

#### Acceptance Criteria

- [ ] `supabase db push` succeeds
- [ ] `supabase migration list` shows aligned
- [ ] Table exists with correct columns and constraints
- [ ] RLS enabled with 3 policies

---

### Slice S7-E: Parent notes UI

**Goal**: Add write capability to the parent view in NotesPage. Parents can compose notes, select recipient (student, advisor, or both), and view their sent notes alongside advisor notes.

**Issues Addressed**: #7

**Depends on**: S7-D

#### Files to Modify

| File | Action |
|------|--------|
| `components/NotesPage.tsx` | MODIFY |

#### Changes

1. In the parent section (line 660+), add a student selector for multi-child parents.
2. Add a "Write Note" card with:
   - Textarea for message.
   - Recipient selector: "Student", "Advisor", "Both" (radio buttons or dropdown).
   - Send button.
3. Add a "My Notes" section showing parent's own sent notes from `parent_notes` table.
4. Keep the existing "Advisor Notes" read-only section below.
5. Fetch `parent_notes` for the selected student on mount/student change.
6. Insert new notes via `supabase.from("parent_notes").insert(...)`.

#### Acceptance Criteria

- [ ] Parent can write and send notes to student, advisor, or both
- [ ] Sent notes appear in "My Notes" section
- [ ] Student sees parent notes in their Notes page (advisor feedback section or new section)
- [ ] Advisor sees parent notes for their assigned students
- [ ] Existing advisor notes display unchanged
- [ ] `npm run build` passes

---

### Phase 4: Schedule Sharing (S7-F)

---

### Slice S7-F: Parent calendar events visible to linked students/advisors

**Goal**: Ensure calendar events created by parents (which are `is_private = false` by default) are visible to the linked student in their schedule view, and to the student's advisor.

**Issues Addressed**: #8

#### DB Changes

**New migration**: `supabase migration new calendar_events_cross_role_visibility`

```sql
-- Students can see non-private events created by their parent
CREATE POLICY "students_see_parent_events" ON calendar_events
  FOR SELECT USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = calendar_events.student_id
        AND s.student_user_id = auth.uid()
    )
  );

-- Advisors can see non-private events for their assigned students
CREATE POLICY "advisors_see_student_events" ON calendar_events
  FOR SELECT USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN profiles p ON p.id = s.advisor_id
      WHERE s.id = calendar_events.student_id
        AND p.user_id = auth.uid()
        AND p.role = 'advisor'
    )
  );
```

#### Frontend Changes

- Verify `fetchCalendarEvents` in `lib/calendar-events.ts` works for student/advisor roles seeing parent-created events (RLS handles filtering).
- If the student schedule view filters by `created_by`, remove that filter so parent events show up.

#### Files to Modify

| File | Action |
|------|--------|
| `supabase/migrations/<ts>_calendar_events_cross_role_visibility.sql` | CREATE |
| `lib/calendar-events.ts` | MODIFY (if needed) |

#### Acceptance Criteria

- [ ] `supabase db push` succeeds
- [ ] Parent creates a public event for a student
- [ ] Student logs in and sees the parent-created event on their schedule
- [ ] Advisor sees the event for their assigned student
- [ ] Private student events remain hidden from parents/advisors
- [ ] `npm run build` passes

---

### Phase 5: Dashboard Enhancements (S7-G, S7-H)

---

### Slice S7-G: Hover pop-ups on signal cards

**Goal**: Add popover tooltips on the 4 parent signal cards (Overdue, Upcoming, Study Plan, Suggestions) that show expanded details on hover/click.

**Issues Addressed**: #9

#### Files to Modify

| File | Action |
|------|--------|
| `components/ParentDashboard.tsx` | MODIFY |

#### Changes

1. Wrap each signal card in a `HoverCard` (from Radix UI) or use the existing `DropdownMenu` / custom tooltip.
2. **Overdue card hover**: Show list of overdue assignment titles (need to pass overdue items from wrapper).
3. **Upcoming card hover**: Show full title, due date, type.
4. **Study Plan card hover**: Show plan details or "No active plan -- suggest one in Assignments."
5. **Suggestions card hover**: Show count breakdown or list of pending suggestions.
6. May need to extend `ParentSignal` type and fetch additional data in `ParentDashboardWrapper`.

**Note**: If Radix `HoverCard` is not installed, use the existing `Popover` component or a simple CSS hover approach with absolute-positioned tooltip divs.

#### Acceptance Criteria

- [ ] Hovering over each signal card shows a popover with details
- [ ] Popover dismisses on mouse leave
- [ ] Mobile: tapping shows the popover (or navigates as before)
- [ ] `npm run build` passes

---

### Slice S7-H: Classes & grades card on dashboard

**Goal**: Add a new card to the parent dashboard showing the selected student's enrolled classes with per-class grade averages.

**Issues Addressed**: #10

#### Files to Modify

| File | Action |
|------|--------|
| `components/ParentDashboard.tsx` | MODIFY |
| `components/ParentDashboardWrapper.tsx` | MODIFY |

#### Changes

**ParentDashboardWrapper.tsx:**
1. Add `fetchStudentClasses` function that queries `student_course_enrollments` JOIN `courses` for the selected student.
2. Add `fetchClassGrades` that queries `assignments` grouped by `course_id` to get per-class averages.
3. Pass data to `ParentDashboard` as new prop `studentClasses`.

**ParentDashboard.tsx:**
1. Add new `ClassesGradesCard` section in the main grid.
2. Display a list of enrolled classes with: class name, teacher, schedule, grade average (or "No grades yet").
3. Color-code grade averages (green >= 80%, yellow 60-79%, red < 60%).

#### Acceptance Criteria

- [ ] Card shows enrolled classes for selected student
- [ ] Grade averages calculated from assignments
- [ ] Switching students updates the card
- [ ] Empty state when no classes enrolled
- [ ] `npm run build` passes

---

### Phase 6: Grade Entry & Archiving (S7-I, S7-J)

---

### Slice S7-I: Schema -- grading periods + semester grades + course archiving

**Goal**: Create tables for semester/grading period tracking and manual grade entry. Add `archived_at` column to `courses`.

**Issues Addressed**: #11, #12

#### DB Changes

**New migration**: `supabase migration new grading_periods_and_semester_grades`

```sql
-- Grading periods (semesters, quarters, etc.)
CREATE TABLE IF NOT EXISTS grading_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- e.g., "Fall 2025", "Spring 2026"
  period_type TEXT NOT NULL DEFAULT 'semester'
    CHECK (period_type IN ('semester', 'quarter', 'trimester', 'year')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grading_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_authenticated_read_grading_periods" ON grading_periods
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed common periods
INSERT INTO grading_periods (name, period_type, start_date, end_date) VALUES
  ('Fall 2024', 'semester', '2024-08-15', '2024-12-20'),
  ('Spring 2025', 'semester', '2025-01-06', '2025-05-30'),
  ('Fall 2025', 'semester', '2025-08-15', '2025-12-19'),
  ('Spring 2026', 'semester', '2026-01-05', '2026-05-29');

-- Semester grades (parent-entered historical grades)
CREATE TABLE IF NOT EXISTS semester_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  grading_period_id UUID NOT NULL REFERENCES grading_periods(id) ON DELETE CASCADE,
  course_name_override TEXT,       -- for courses not in system
  grade_letter TEXT,               -- A, B+, C, etc.
  grade_percent REAL,              -- 0.0 to 100.0
  entered_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_semester_grades_student ON semester_grades(student_id);
CREATE INDEX idx_semester_grades_period ON semester_grades(grading_period_id);

ALTER TABLE semester_grades ENABLE ROW LEVEL SECURITY;

-- Parents can CRUD grades for their students
CREATE POLICY "parents_manage_semester_grades" ON semester_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = semester_grades.student_id
        AND s.parent_id = auth.uid()
    )
  );

-- Students can read their own grades
CREATE POLICY "students_read_own_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = semester_grades.student_id
        AND s.student_user_id = auth.uid()
    )
  );

-- Advisors can read grades for assigned students
CREATE POLICY "advisors_read_student_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles p ON p.id = s.advisor_id
      WHERE s.id = semester_grades.student_id
        AND p.user_id = auth.uid()
        AND p.role = 'advisor'
    )
  );

-- Add archived_at to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
```

#### Acceptance Criteria

- [ ] `supabase db push` succeeds
- [ ] `grading_periods` table with 4 seeded rows
- [ ] `semester_grades` table with correct constraints
- [ ] `courses.archived_at` column exists
- [ ] RLS policies verified

---

### Slice S7-J: Grade entry UI + class archiving

**Goal**: Create a UI for parents to enter/edit semester grades for their students and archive old classes.

**Issues Addressed**: #11, #12

**Depends on**: S7-I

#### Files to Create/Modify

| File | Action |
|------|--------|
| `components/GradeEntryPage.tsx` | CREATE |
| `app/(dash)/[role]/layout.tsx` | MODIFY |
| `components/Sidebar.tsx` | MODIFY (if adding nav item) |

#### Changes

**Option A (Recommended)**: Add grade entry as a sub-section within the existing Reports page for parents.
**Option B**: Create separate "Grades" sidebar item.

Going with Option A to avoid sidebar bloat:

1. Create `GradeEntryPage.tsx`:
   - Student selector (for multi-child parents).
   - Grading period selector dropdown.
   - Table: Course Name | Grade Letter | Grade % | Notes | Actions (edit/delete).
   - "Add Grade" button opens inline form or modal.
   - "Archive Class" button on each enrolled course (sets `archived_at`).
   - Archived classes shown in a collapsed "Archived" section with "Restore" option.
2. Integrate into the Reports page or add as a new sub-tab accessible from the dashboard classes card.

#### Acceptance Criteria

- [ ] Parent can select student and grading period
- [ ] Parent can add a grade (letter, percent, optional notes)
- [ ] Parent can edit and delete grades
- [ ] Parent can archive/restore classes
- [ ] Grades persist in database
- [ ] `npm run build` passes

---

### Phase 7: Image Downsampling (S7-K)

---

### Slice S7-K: Client-side image downsampling to ~1MB

**Goal**: Before uploading images to the chat endpoint, compress/resize them client-side to approximately 1MB using HTML Canvas.

**Issues Addressed**: #13

#### Files to Create/Modify

| File | Action |
|------|--------|
| `lib/image-compress.ts` | CREATE |
| `components/ChatInterface.tsx` | MODIFY |
| `components/ParentChatInterface.tsx` | MODIFY |

#### Changes

**New `lib/image-compress.ts`:**
```typescript
/**
 * Compress an image file to approximately targetSizeBytes.
 * Uses canvas resize + progressive JPEG quality reduction.
 * Returns a new File object.
 */
export async function compressImage(
  file: File,
  targetSizeBytes: number = 1_048_576  // 1MB
): Promise<File> {
  // If already under target, return as-is
  if (file.size <= targetSizeBytes) return file;

  // Load image into canvas
  // Calculate scale factor: sqrt(targetSize / currentSize)
  // Draw scaled image on canvas
  // Export as JPEG with progressive quality reduction (0.9, 0.8, 0.7, ...)
  // Stop when under target or quality reaches 0.5
  // Return new File with compressed blob
}
```

**Modify `ChatInterface.tsx` + `ParentChatInterface.tsx`:**
1. Import `compressImage` from `lib/image-compress.ts`.
2. In `handleFileSelect`, after validation, call `compressImage(file)`.
3. Use the compressed file for the preview URL and for upload.
4. Show a brief "Compressing..." indicator if compression takes > 200ms.

**Note**: HEIC files cannot be rendered on canvas in most browsers. For HEIC, skip compression (the 8MB server limit still applies). Azure vision handles HEIC natively.

#### Acceptance Criteria

- [ ] JPEG/PNG images > 1MB are compressed before upload
- [ ] Compressed images are under ~1.2MB (allow small overshoot)
- [ ] Images already under 1MB are not re-compressed
- [ ] HEIC files are skipped (uploaded at original size)
- [ ] Image quality remains acceptable after compression
- [ ] Preview thumbnail shows the compressed version
- [ ] `npm run build` passes

---

## C) Dependencies Diagram

```
S7-A: Dashboard header cleanup
  |
  +---> S7-B: Remove redundant cards + simplify students card
          |
          +---> S7-C: Parent Settings page (add student, advisor, invite)

S7-D: Parent notes schema
  |
  +---> S7-E: Parent notes UI

S7-F: Schedule event sharing (independent)

S7-G: Signal card hover pop-ups (independent, after S7-B)

S7-H: Classes/grades card (independent)

S7-I: Grade entry schema
  |
  +---> S7-J: Grade entry UI + class archiving

S7-K: Image downsampling (independent)
```

**Execution order**: S7-A -> S7-B -> S7-C -> S7-D -> S7-E -> S7-F -> S7-G -> S7-H -> S7-I -> S7-J -> S7-K

Independent slices that can run in parallel: S7-D/F/H/I/K (all independent of each other).

---

## D) Files Summary

| File | Action | Slice(s) |
|------|--------|----------|
| `components/ParentDashboard.tsx` | MODIFY | S7-A, S7-B, S7-G, S7-H |
| `components/ParentDashboardWrapper.tsx` | MODIFY | S7-B, S7-H |
| `components/ParentSettingsPage.tsx` | CREATE | S7-C |
| `app/(dash)/[role]/layout.tsx` | MODIFY | S7-C, S7-J |
| `supabase/migrations/<ts>_parent_notes.sql` | CREATE | S7-D |
| `components/NotesPage.tsx` | MODIFY | S7-E |
| `supabase/migrations/<ts>_calendar_events_cross_role_visibility.sql` | CREATE | S7-F |
| `lib/calendar-events.ts` | MODIFY | S7-F (if needed) |
| `supabase/migrations/<ts>_grading_periods_and_semester_grades.sql` | CREATE | S7-I |
| `components/GradeEntryPage.tsx` | CREATE | S7-J |
| `components/Sidebar.tsx` | MODIFY | S7-J (if adding nav item) |
| `lib/image-compress.ts` | CREATE | S7-K |
| `components/ChatInterface.tsx` | MODIFY | S7-K |
| `components/ParentChatInterface.tsx` | MODIFY | S7-K |

---

## E) Verification Checklist

Per-slice (run after each slice):
- [ ] `supabase db push` succeeds (if schema changes)
- [ ] `supabase db pull` confirms sync (if schema changes)
- [ ] `supabase migration list` shows aligned (if schema changes)
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `git diff` reviewed -- only intended files changed
- [ ] No secrets added
- [ ] No existing migrations edited

End-to-end (after all slices):
- [ ] Parent dashboard shows dynamic student name, no redundant cards
- [ ] Settings has add student, advisor assignment, invite codes
- [ ] Parent can write notes visible to student and advisor
- [ ] Parent schedule events visible to linked student
- [ ] Signal cards show hover pop-ups with details
- [ ] Classes/grades card displays on dashboard
- [ ] Parent can enter historical grades per semester
- [ ] Parent can archive/restore classes
- [ ] Images > 1MB are compressed before upload
- [ ] All existing functionality unchanged for student/advisor roles

---

## F) What We Are NOT Doing

1. **No chat message persistence** -- chat remains localStorage-only
2. **No real-time notifications** -- no push notifications for new parent notes
3. **No parent-to-parent messaging** -- notes go to student/advisor only
4. **No automatic grade import** -- grades are manually entered by parent
5. **No GPA calculation** -- individual grades only, no cumulative GPA
6. **No server-side image compression** -- client-side only via canvas
7. **No drag-and-drop for file upload** -- existing click-to-attach only
8. **No advisor write-access to semester grades** -- parent-only entry
9. **No changes to student or advisor dashboard layouts**
10. **No TopNavigation changes** -- sign-out stays in dropdown as-is

---

## G) Slice Status Tracker

| Slice | Status | Commit SHA | Date | Notes |
|-------|--------|------------|------|-------|
| S7-A: Dashboard header | [x] | 8499ee0 | 2026-02-14 | Dynamic student name |
| S7-B: Remove redundant cards | [x] | 4e2350d | 2026-02-14 | Parent essentials + signals & actions |
| S7-C: Parent Settings page | [x] | a4a7d1f | 2026-02-14 | Add student, advisor, invite |
| S7-D: Parent notes schema | [x] | 1ce5254 | 2026-02-14 | parent_notes table + RLS |
| S7-E: Parent notes UI | [x] | ba46fbc | 2026-02-14 | Write capability in NotesPage |
| S7-F: Schedule sharing | [x] | c833899 | 2026-02-14 | Advisor calendar event visibility |
| S7-G: Signal card hover | [x] | 95373e8 | 2026-02-14 | HoverCard popovers on 4 signal cards |
| S7-H: Classes/grades card | [x] | f191da0 | 2026-02-14 | Dashboard card with per-class averages |
| S7-I: Grade entry schema | [x] | 6a18d53 | 2026-02-14 | grading_periods + semester_grades + archived_at |
| S7-J: Grade entry UI | [x] | 7ea5e7e | 2026-02-14 | Entry form + class archiving in Reports |
| S7-K: Image downsampling | [x] | c0d2b8a | 2026-02-14 | Canvas compression to ~1MB |

Legend: `[x]` complete, `[~]` in progress, `[ ]` not started, `[!]` blocked

---

## H) Gotchas & Notes

1. **ParentDashboardWrapper state**: When moving add-student/advisor-assignment to Settings, the new `ParentSettingsPage` must manage its own state independently. Don't share state between dashboard and settings since they render in different `activeItem` contexts.
2. **Calendar events RLS**: Check if existing policies conflict before adding new ones. Use `CREATE POLICY ... IF NOT EXISTS` or check with `\dp calendar_events` first.
3. **advisor_id on students**: The `advisor_id` column on `students` references `profiles.id` (not `auth.users.id`). The RLS policy for `semester_grades` advisor read must JOIN through `profiles` to get `user_id`.
4. **HEIC compression**: Canvas cannot render HEIC. Skip compression for HEIC/HEIF. The 8MB upload limit still applies.
5. **Parent notes vs advisor notes**: These are separate tables with separate semantics. Parent notes show in the student's Notes page alongside advisor notes but in a distinct section.
6. **Grading periods**: Seeded with common semesters. Parents can select which period a grade belongs to. No UI to create custom periods in this PRD -- can be added later.
7. **Removed props cleanup**: S7-B removes many props from `ParentDashboard`. Ensure TypeScript catches any missed references during build.

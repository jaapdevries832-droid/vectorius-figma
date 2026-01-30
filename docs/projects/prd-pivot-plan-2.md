# Vectorius PRD Pivot Plan 2: UI Fixes from Bot Testing

**Created**: 2026-01-29
**Branch**: lesson-53
**Target**: Fix all UI issues found by bot testing across Parent, Student, and Advisor dashboards

---

## Key Findings Summary

A UI testing bot explored the application as three personas:
- **Sarah** (Parent of Maya, 7th grader)
- **Maya** (Student)
- **Michael** (Math Advisor)

The bot identified 16 issues across three severity levels.

---

## A) Issues Identified

### MAJOR Issues (Must Fix)

| # | Issue | Role | Location |
|---|-------|------|----------|
| 1 | No dedicated Reports/Children Overview page | Parent | Missing page |
| 2 | Add Assignment button non-functional | Student | AssignmentsPage |
| 3 | Inconsistent assignment counts (dashboard shows 3, page shows 0) | Student/Advisor | Dashboard vs AssignmentsPage |
| 4 | Empty Students page ("Advisor-only area" placeholder) | Advisor | Students page |
| 5 | Non-functional buttons (View Full Profile, Send Message, Create Assignment) | Advisor | AdvisorDashboard |

### MEDIUM Issues

| # | Issue | Role | Location |
|---|-------|------|----------|
| 6 | Summary cards look clickable but aren't | Parent | ParentDashboard |
| 7 | "Linked/Invite" labels don't behave like buttons | Parent | ParentDashboard |
| 8 | Assignments page shows "available for student accounts only" | Advisor | AssignmentsPage |
| 9 | Due date field doesn't open calendar | Advisor | AssignmentModal |
| 10 | Schedule shows 24 hours/week but calendar is empty | Advisor | WeeklyPlanner |
| 11 | Notes cannot be edited or deleted | Student | StudentDashboard/NotesPage |

### MINOR Issues

| # | Issue | Role | Location |
|---|-------|------|----------|
| 12 | Viewing dropdown has narrow clickable area | Parent | ParentDashboard |
| 13 | Top-bar icons (star/sparkle) have no tooltip or function | All | TopNavigation |
| 14 | Add Student form lacks validation messages | Parent | ParentDashboard |
| 15 | Locked badges have no tooltips showing how to earn them | Student | AchievementsPage |
| 16 | Class creation lacks validation for day/time format | Student | StudentDashboard |

---

## B) 10-Slice Implementation Plan

---

### Slice S2-A: Fix Assignment Data Consistency

**Goal**: Ensure dashboard assignment counts match the Assignments page data.

**Issue Addressed**: #3 - Inconsistent assignment counts

#### Root Cause
- `StudentDashboard.tsx` fetches with `.limit(6)` and filters suggested tasks differently
- `AssignmentsPage.tsx` uses different filtering logic
- Counts diverge due to inconsistent query filters

#### DB + RLS Changes
- None required

#### Frontend Changes
- **Modify**: `components/StudentDashboard.tsx`
  - Use separate count query without `.limit()`
  - Align filter: `.or("is_suggested.eq.false,suggestion_status.eq.accepted,suggestion_status.is.null")`

- **Modify**: `components/AssignmentsPage.tsx`
  - Ensure filter logic matches dashboard for active assignments

#### Acceptance Criteria
- [ ] Dashboard "X due" count matches Assignments page totals
- [ ] Adding an assignment updates both counts
- [ ] Completing an assignment updates both counts
- [ ] Pending suggestions excluded from active counts

#### Manual Test Script
1. Login as Maya (student)
2. Dashboard - note "Due" count
3. Assignments page - count Overdue + Today items
4. Verify counts match
5. Create new assignment with due date = today
6. Return to Dashboard - verify count incremented

---

### Slice S2-B: Make Parent Summary Cards Interactive

**Goal**: Parent dashboard signal cards link to detailed views.

**Issues Addressed**: #6, #7 - Non-interactive cards, non-actionable labels

#### DB + RLS Changes
- None required

#### Frontend Changes
- **Modify**: `components/ParentDashboard.tsx`
  - Lines 197-268: Add onClick handlers to signal cards
    - "Overdue Items" → assignments view with `?filter=overdue`
    - "Upcoming Test/Project" → highlight specific assignment
    - "Study Plan" → schedule view
    - "Your Suggestions" → pending suggestions view
  - Lines 462-478: Make "Linked/Invite" labels proper buttons
  - Add hover states and cursor-pointer

- **Modify**: `components/ParentDashboardWrapper.tsx`
  - Add navigation handlers for card clicks

#### Acceptance Criteria
- [ ] Clicking "Overdue Items" navigates to filtered assignments
- [ ] Clicking "Upcoming Test/Project" highlights the item
- [ ] Clicking "Study Plan" navigates to schedule
- [ ] Clicking "Your Suggestions" shows pending suggestions
- [ ] Cards have visible hover state
- [ ] "Invite" label opens invite modal on click

#### Manual Test Script
1. Login as Sarah (parent)
2. Select Maya as viewing student
3. Click each signal card - verify navigation
4. Find student with "Invite" label - click it
5. Verify invite modal opens

---

### Slice S2-C: Add Parent Reports/Children Overview Page

**Goal**: Create dedicated reports page for grade breakdowns and test scores.

**Issue Addressed**: #1 (MAJOR) - No Reports/Children Overview page

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_parent_children_report_view.sql`

```sql
CREATE OR REPLACE VIEW public.parent_children_report
WITH (security_invoker = true)
AS
SELECT
  s.id as student_id,
  s.parent_id,
  concat(s.first_name, ' ', coalesce(s.last_name, '')) as student_name,
  s.grade,

  -- Assignment statistics
  count(a.id) filter (where a.status not in ('completed', 'done', 'archived')) as active_assignments,
  count(a.id) filter (where a.status in ('completed', 'done')) as completed_assignments,
  count(a.id) filter (where a.status not in ('completed', 'done', 'archived') and a.due_at < now()) as overdue_assignments,

  -- Grade statistics (percentage)
  round(avg(case when a.max_score > 0 then (a.score::numeric / a.max_score) * 100 end)::numeric, 1) as avg_grade_percent,

  -- Recent activity
  max(a.completed_at) as last_completion,
  max(a.created_at) as last_assignment_added

FROM students s
LEFT JOIN assignments a ON a.student_id = s.id
GROUP BY s.id, s.parent_id, s.first_name, s.last_name, s.grade;
```

#### Frontend Changes
- **New page**: `app/(dash)/parent/reports/page.tsx`
- **New component**: `components/ParentReportsPage.tsx`
  - Student selector
  - Grade breakdown by assignment type
  - Assignment completion rate
  - Upcoming tests/projects list
  - Recent scores table

- **Modify**: `components/Sidebar.tsx` - Add "Reports" for parent role
- **Modify**: `app/(dash)/[role]/layout.tsx` - Add 'reports' case

#### Acceptance Criteria
- [ ] Parents see "Reports" in sidebar
- [ ] Reports page shows student selector
- [ ] Grade breakdown displays by type
- [ ] Completion rate shown as percentage
- [ ] Upcoming items listed with due dates
- [ ] Recent scores shown in table

#### Manual Test Script
1. Login as Sarah (parent)
2. Click "Reports" in sidebar
3. Verify student selector shows Maya
4. Verify grade data displays
5. Check completion rate
6. Verify upcoming items list

---

### Slice S2-D: Fix Advisor Students Page

**Goal**: Replace placeholder text with actual student roster.

**Issue Addressed**: #4 (MAJOR) - Empty Students page

#### DB + RLS Changes
- None required (`advisor_student_summary` view exists)

#### Frontend Changes
- **New component**: `components/AdvisorStudentsPage.tsx`
  - Fetch from `advisor_student_summary` view
  - Display: Name, grade, performance %, status badge, assignments count
  - Search/filter functionality
  - Click row to view details

- **Modify**: `app/(dash)/[role]/layout.tsx`
  - Lines 119-124: Replace placeholder with `<AdvisorStudentsPage />`

- **Modify**: `components/AdvisorDashboard.tsx`
  - Add "View All Students" link

#### Acceptance Criteria
- [ ] Advisor sees full student roster on Students page
- [ ] Students sorted by last activity
- [ ] Search filters by name
- [ ] Performance badges display correctly
- [ ] Empty state shows "No students assigned"

#### Manual Test Script
1. Login as Michael (advisor)
2. Click "Students" in sidebar
3. Verify roster loads with Maya
4. Use search to filter
5. Verify performance badges

---

### Slice S2-E: Fix Advisor Dashboard Buttons

**Goal**: Make View Full Profile, Send Message, and Create Assignment buttons functional.

**Issue Addressed**: #5 (MAJOR) - Non-functional buttons

#### DB + RLS Changes
- None required

#### Frontend Changes
- **Modify**: `components/AdvisorDashboard.tsx`
  - Lines 473-478: Wire "Send Message" to message modal
  - Lines 476-478: Wire "View Full Profile" to profile modal

- **New component**: `components/AdvisorMessageModal.tsx`
  - Message text input, priority selector
  - Inserts into `advisor_notes` table
  - Success toast on send

- **New component**: `components/StudentProfileModal.tsx`
  - Student details: name, grade, school
  - Advisor notes history
  - Assignment summary

#### Acceptance Criteria
- [ ] "View Full Profile" opens profile modal
- [ ] "Send Message" opens message modal
- [ ] Message creates advisor_notes record
- [ ] Message appears in student's advisor feedback
- [ ] "Create Assignment" opens modal (verify existing)

#### Manual Test Script
1. Login as Michael (advisor)
2. Select student from roster
3. Click "View Full Profile" - modal opens
4. Close, click "Send Message"
5. Send message with priority
6. Login as Maya - verify message appears

---

### Slice S2-F: Fix Advisor Assignments Page Access

**Goal**: Allow advisors to view and manage assignments for their students.

**Issue Addressed**: #8 - Assignments page blocked for advisors

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_advisor_assignments_access.sql`

```sql
-- Allow advisors to read assignments for their assigned students
CREATE POLICY "advisors_read_student_assignments" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = assignments.student_id
      AND students.advisor_id = auth.uid()
    )
  );
```

#### Frontend Changes
- **Modify**: `components/AssignmentsPage.tsx`
  - Lines 139-145: Remove role check blocking non-students
  - Add advisor view:
    - Load assignments for ALL assigned students
    - Show student name column
    - Add student filter dropdown
  - Advisor can create but not complete assignments

#### Acceptance Criteria
- [ ] Advisors can access Assignments page
- [ ] Shows assignments for all assigned students
- [ ] Student filter allows focusing on one
- [ ] Advisor can create assignment
- [ ] Advisor cannot mark complete (student-only)

#### Manual Test Script
1. Login as Michael (advisor)
2. Click "Assignments" in sidebar
3. Verify page loads (not blocked)
4. Verify shows Maya's assignments
5. Use student filter
6. Create new assignment

---

### Slice S2-G: Student Notes Edit/Delete Functionality

**Goal**: Allow students to edit and delete their quick notes.

**Issue Addressed**: #11 - Notes cannot be edited/deleted

#### DB + RLS Changes
- None required

#### Frontend Changes
- **Modify**: `components/StudentDashboard.tsx`
  - Lines 929-939: Add edit functionality
  - Add visible delete button with confirmation

- **Modify**: `components/NotesPage.tsx`
  - Lines 357-374: Add edit button alongside delete
  - Inline edit mode or edit modal

- **New component**: `components/NoteEditModal.tsx`
  - Edit note body and color
  - Save/cancel buttons

#### Acceptance Criteria
- [ ] Student can edit existing notes
- [ ] Edit saves to database
- [ ] Student can delete notes with confirmation
- [ ] Both dashboard and Notes page support edit/delete

#### Manual Test Script
1. Login as Maya (student)
2. Dashboard > Quick Notes
3. Edit a note - verify change persists
4. Delete a note with confirmation
5. Notes page - verify same functionality

---

### Slice S2-H: Form Validation Improvements

**Goal**: Add proper validation with helpful error messages.

**Issues Addressed**: #14, #16 - Form validation lacking

#### DB + RLS Changes
- None required

#### Frontend Changes
- **Modify**: `components/ParentDashboard.tsx`
  - Lines 307-371: Add Student form validation
    - First name: required, min 2 chars
    - Grade: required selection
    - Inline error messages

- **Modify**: `components/StudentDashboard.tsx`
  - Lines 673-713: Class creation validation
    - Title: required, min 3 chars
    - Format helper text for schedule

- **Modify**: `components/AssignmentModal.tsx`
  - Title: required, min 3 chars
  - Due date: required, not in past

- **New utility**: `lib/validation.ts`
  - `validateName()`, `validateRequired()`, `validateFutureDate()`

#### Acceptance Criteria
- [ ] Add Student shows error for empty name
- [ ] Grade selection required
- [ ] Class creation shows format guidance
- [ ] Assignment modal validates title/date
- [ ] Errors clear when corrected

#### Manual Test Script
1. Login as Sarah (parent)
2. Try add student with empty name - error
3. Enter valid data - submits
4. Login as Maya (student)
5. Try create class with short title - error

---

### Slice S2-I: UI Polish (Tooltips, Date Pickers, Clickable Areas)

**Goal**: Fix minor UI interaction issues.

**Issues Addressed**: #9, #12, #13, #15

#### DB + RLS Changes
- None required

#### Frontend Changes
- **Modify**: `components/AssignmentModal.tsx`
  - Lines 154-163: Verify date picker works, add click handler if needed

- **Modify**: `components/ParentDashboard.tsx`
  - Lines 159-182: Increase dropdown trigger width/padding

- **Modify**: `components/TopNavigation.tsx`
  - Add tooltips to bell and settings icons
  - Wire icons to actions

- **Modify**: `components/AchievementsPage.tsx`
  - Add tooltips to locked badges showing unlock criteria

#### Acceptance Criteria
- [ ] Date picker opens on click
- [ ] Student dropdown has wide clickable area
- [ ] Icons have tooltips
- [ ] Locked badges show unlock criteria on hover

#### Manual Test Script
1. Login as Michael (advisor)
2. Open assignment modal - verify date picker
3. Login as Sarah (parent)
4. Click student selector - verify easy to click
5. Hover icons - tooltips show
6. Login as Maya (student)
7. Achievements - hover locked badge - criteria shows

---

### Slice S2-J: E2E Verification and Polish

**Goal**: Verify all fixes work together; fix remaining issues.

#### DB + RLS Changes
- None (unless issues found)

#### Frontend Changes
- Fix bugs discovered during E2E testing
- Add missing loading states
- Improve error messages

#### Acceptance Criteria
- [ ] **Parent Flow**: Login → correct counts → click cards → view reports → suggest task
- [ ] **Student Flow**: Login → correct counts → edit/delete notes → accept suggestions → complete assignments
- [ ] **Advisor Flow**: Login → see roster → view profile → send message → create assignment → view assignments
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No console errors
- [ ] All 16 issues verified fixed

#### Manual Test Script

**Full Parent Flow:**
1. Login as Sarah
2. Dashboard shows correct overdue count
3. Click "Overdue Items" - navigates to filtered view
4. Click "Reports" - view grade breakdown
5. Suggest task to Maya

**Full Student Flow:**
1. Login as Maya
2. Dashboard shows correct due count
3. Accept parent's suggestion
4. Edit a note, delete another
5. Assignments page - counts match dashboard

**Full Advisor Flow:**
1. Login as Michael
2. Click "Students" - see Maya
3. View Full Profile
4. Send Message
5. Assignments page - see Maya's assignments
6. Create assignment

**Cross-Role:**
1. Login as Maya - verify advisor message
2. Login as Sarah - verify advisor note visible

---

## C) Dependencies & Sequencing

```
S2-A (Counts) ─────────────────────────────────────────────────────┐
                                                                    │
S2-B (Cards) ──────────────────────────────────────┐                │
                                                    │                │
S2-C (Reports) ────────────────────────────────────┤                │
                                                    │                │
S2-D (Students) ──────> S2-E (Buttons) ──────> S2-F (Assignments)   │
                                                    │                │
S2-G (Notes) ──────────────────────────────────────┤                │
                                                    │                │
S2-H (Validation) ─────────────────────────────────┤                │
                                                    │                │
S2-I (Polish) ─────────────────────────────────────┴────────────────┴──> S2-J (E2E)
```

**Required Order:**
1. S2-D before S2-E (need roster before buttons)
2. S2-E before S2-F (need profile/message before full access)
3. S2-J must be last

**Recommended Execution:**
S2-A → S2-D → S2-E → S2-F → S2-B → S2-C → S2-G → S2-H → S2-I → S2-J

---

## D) Files to Modify Summary

| Slice | New Files | Modified Files |
|-------|-----------|----------------|
| S2-A | - | `StudentDashboard.tsx`, `AssignmentsPage.tsx` |
| S2-B | - | `ParentDashboard.tsx`, `ParentDashboardWrapper.tsx` |
| S2-C | `ParentReportsPage.tsx`, migration | `Sidebar.tsx`, `layout.tsx` |
| S2-D | `AdvisorStudentsPage.tsx` | `layout.tsx`, `AdvisorDashboard.tsx` |
| S2-E | `AdvisorMessageModal.tsx`, `StudentProfileModal.tsx` | `AdvisorDashboard.tsx` |
| S2-F | migration | `AssignmentsPage.tsx`, `layout.tsx` |
| S2-G | `NoteEditModal.tsx` | `StudentDashboard.tsx`, `NotesPage.tsx` |
| S2-H | `lib/validation.ts` | `ParentDashboard.tsx`, `StudentDashboard.tsx`, `AssignmentModal.tsx` |
| S2-I | - | `AssignmentModal.tsx`, `ParentDashboard.tsx`, `TopNavigation.tsx`, `AchievementsPage.tsx` |
| S2-J | - | Various bug fixes |

---

## E) Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed | Notes |
|---:|---|---|---|---|---|
| S2-A | Fix Assignment Data Consistency | ⬜ | - | - | Dashboard/page count mismatch |
| S2-B | Interactive Parent Cards | ⬜ | - | - | Cards drill-down to details |
| S2-C | Parent Reports Page | ⬜ | - | - | Grade breakdowns, test scores |
| S2-D | Advisor Students Page | ⬜ | - | - | Real roster, not placeholder |
| S2-E | Advisor Dashboard Buttons | ⬜ | - | - | View Profile, Send Message |
| S2-F | Advisor Assignments Access | ⬜ | - | - | Remove role block |
| S2-G | Notes Edit/Delete | ⬜ | - | - | Student note management |
| S2-H | Form Validation | ⬜ | - | - | Add Student, Class creation |
| S2-I | UI Polish | ⬜ | - | - | Tooltips, date pickers, etc. |
| S2-J | E2E Verification | ⬜ | - | - | Full flow testing |

---

## F) Verification Checklist (Per Slice)

Each slice must pass before commit:

- [ ] `supabase db push` succeeds (if migration)
- [ ] `supabase db pull` confirms sync (if migration)
- [ ] `supabase migration list` shows aligned (if migration)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test script executed successfully
- [ ] Commit message: `slice S2-X: <description>`
- [ ] Co-Authored-By included
- [ ] Slice marked ✅ in tracker

---

## G) Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Assignment count queries slow | Medium | Use `count` aggregation with `head: true` |
| Reports page empty for no assignments | Low | Graceful empty state messaging |
| Date picker browser compatibility | Low | Test Chrome, Firefox, Safari |
| Advisor RLS too permissive | High | Test cross-advisor isolation |
| Notes edit loses data | Medium | Confirmation before discard |

---

## H) What We Are NOT Doing

- Real-time subscription updates (page load refresh only)
- Complex charting library (CSS/SVG for simple charts)
- Full messaging system (using advisor_notes table)
- Student profile editing by advisor (view-only)
- Batch assignment creation
- Email notifications

---

## I) Agent Correction Checklist

### Before Each Slice
- [ ] Confirmed branch is `lesson-53`
- [ ] `git status` shows clean working tree
- [ ] Read slice requirements completely

### During Implementation
- [ ] Only creating NEW migration files
- [ ] RLS enabled with deny-by-default
- [ ] Following existing codebase patterns

### After Each Slice
- [ ] `supabase db push` succeeded (if migration)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test executed
- [ ] `git diff` reviewed
- [ ] No secrets in diff
- [ ] Commit follows format
- [ ] Slice status updated

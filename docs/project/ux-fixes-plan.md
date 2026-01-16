# UX Fixes Plan (AI Persona Testing Results)

This doc outlines fixes for UX issues discovered during AI persona testing with ChatGPT agent across Student (Maya), Parent (Sarah), and Advisor (Michael) personas.

## Testing Summary

**Date:** 2026-01-16
**Branch:** lesson-51
**Test Method:** ChatGPT agent with magic link authentication

### Issues by Severity

| Severity | Count | Examples |
|----------|-------|----------|
| Major | 6 | No student profile, no assigned students, assignment creation broken |
| Medium | 8 | Empty skill modules, placeholder pages, unclear dropdowns |
| Minor | 9 | Debug overlays, missing feedback, small delete links |

---

## Issue Inventory by Persona

### Student (Maya) Issues

- `components/StudentDashboard.tsx` "No student profile found" error - `student_user_id` not linked to auth user
- `components/WeeklyPlanner.tsx` "Unable to load student profile" when adding class
- `components/AssignmentsPage.tsx` No assignments shown, creation blocked
- `components/StudentSkills.tsx` No modules assigned, no way to browse
- Quick Notes card click does nothing
- All metrics show 0% / 0 values
- Debug overlay visible (INP Issue panel)

### Parent (Sarah) Issues

- `components/ParentDashboard.tsx` Grade shows "– –" instead of actual grade
- `app/parent/page.tsx` Progress/upcoming/completed cards all show 0
- Student selector dropdown not visually obvious (plain text with small arrow)
- No success message after adding student
- Grade field accepts any text (no validation)
- Small "Delete" link easy to miss
- Advisor Notes section empty with no way to add notes
- Navigation references pages that 404 (reports, children overview)

### Advisor (Michael) Issues

- `components/AdvisorDashboard.tsx` "No assigned students yet" - `students.advisor_id` not populated
- Assignment creation buttons don't work (warning: "student accounts only")
- `components/MentorSkills.tsx` Assign modal has no students in dropdown
- `app/(dash)/[role]/layout.tsx` Notes page is placeholder
- Add Class modal lacks save confirmation
- Search bar returns no results
- Debug overlay visible

---

## Root Causes Identified

### Data Linking Issues

1. **`students.student_user_id` not populated** - Student auth users have no link to their student record
2. **`students.advisor_id` not populated** - Test persona uses `student_advisor` junction table but dashboard queries `advisor_id` column
3. **No sample assignments** - Grade metrics require assignments with `score`/`max_score`

### Missing Functionality

1. **Notes page placeholder** - All roles see "This is a placeholder view for Notes"
2. **Parent navigation incomplete** - Menu shows student-focused items, not parent-focused
3. **Advisor assignment creation** - Blocked by missing student courses/enrollments

### UI Polish

1. **Debug overlays visible** - Next.js/Vercel dev tools shown in preview
2. **Missing feedback** - No toast/confirmation for success actions
3. **Poor form validation** - Grade accepts any text

---

## Chunked Implementation Plan (10 slices)

### Slice 1: Fix Student Profile Linking (CRITICAL)

**Problem:** Students see "No student profile found" after login.

**Changes:**
- Create migration to set `students.student_user_id` for Maya test persona
- Update student lookup logic to handle edge cases gracefully

**Files:**
- `supabase/migrations/` - New migration
- `components/StudentDashboard.tsx` - Improve error handling

**Verification:** Maya logs in and sees dashboard with her name, no error message.

---

### Slice 2: Fix Advisor-Student Relationship (CRITICAL)

**Problem:** Advisor sees "No assigned students" because `students.advisor_id` is NULL.

**Changes:**
- Create migration to populate `students.advisor_id` from `student_advisor` junction table
- Ensure Maya has Michael as her advisor

**Files:**
- `supabase/migrations/` - New migration

**Verification:** Michael sees Maya in student roster; skill module modal shows Maya.

---

### Slice 3: Enable Class Creation for Students

**Problem:** "Create Class" buttons show profile error.

**Changes:**
- Fix student ID lookup after Slice 1 linking
- Add success toast after class creation
- Improve error messages

**Files:**
- `components/StudentDashboard.tsx`
- `components/WeeklyPlanner.tsx`
- `components/ClassSetupModal.tsx`

**Verification:** Maya can create a class; it appears in schedule.

---

### Slice 4: Enable Assignment Creation for Advisors

**Problem:** Assignment buttons don't work; shows "student accounts only" warning.

**Changes:**
- Allow advisors to create assignments for their students
- Fix course dropdown to show student's enrolled courses
- Remove misleading warning for advisors

**Files:**
- `components/AdvisorDashboard.tsx`
- `components/AssignmentsPage.tsx`
- `components/AssignmentModal.tsx`

**Verification:** Michael can create an assignment for Maya.

---

### Slice 5: Implement Notes Page for All Roles

**Problem:** Notes page shows placeholder text for all roles.

**Changes:**
- Create NotesPage component with role-specific views
- Students: personal notes + advisor feedback
- Advisors: create notes for students (advisor_notes table)
- Parents: view advisor notes (read-only)

**Files:**
- `components/NotesPage.tsx` - New component
- `app/(dash)/[role]/layout.tsx` - Wire up component

**Verification:** All roles see functional Notes page; advisors can write notes parents can read.

---

### Slice 6: Fix Parent Grade Display

**Problem:** Grade shows "– –" and all counts show 0.

**Changes:**
- Create migration to add sample assignments for Maya with scores
- Improve "no data" messaging (show "No grades yet" instead of "– –")

**Files:**
- `supabase/migrations/` - Seed sample assignments
- `components/ParentDashboard.tsx` - Improve empty state
- `app/parent/page.tsx` - Handle edge cases

**Verification:** Sarah sees Maya's grade percentage; counts show non-zero values.

---

### Slice 7: Improve Student Selector UX

**Problem:** Dropdown looks like plain text; not obvious it's interactive.

**Changes:**
- Add visible border/outline to Select component
- Add label "Viewing:" or "Selected child:"
- Increase visual prominence

**Files:**
- `components/ParentDashboard.tsx`

**Verification:** Student selector is clearly a dropdown with visible affordance.

---

### Slice 8: Add Form Validation and Feedback

**Problem:** No validation on grade field; no confirmation after actions.

**Changes:**
- Replace grade text input with dropdown (K-12 or numeric)
- Add toast notifications for success/error states
- Add form validation before submission

**Files:**
- `app/parent/page.tsx` - Grade validation + toasts
- `components/WeeklyPlanner.tsx` - Save confirmation
- `components/ClassSetupModal.tsx` - Validation

**Verification:** Grade only accepts valid values; users see confirmation after actions.

---

### Slice 9: Implement Parent-Specific Navigation

**Problem:** Parents see student-focused menu items (AI Chat, Skills, Achievements).

**Changes:**
- Create parent-specific menu items
- Add/stub "Reports" page for parent view
- Hide or relabel non-applicable items

**Files:**
- `app/(dash)/[role]/layout.tsx` - Parent menu logic
- `components/Sidebar.tsx` - Role-based menu

**Verification:** Parent navigation makes sense; no 404s on menu clicks.

---

### Slice 10: Remove Development Overlays

**Problem:** "INP Issue" debug panel and Vercel toolbar visible in preview.

**Changes:**
- Configure Next.js to hide dev indicators in preview builds
- Remove or conditionally hide debug panels

**Files:**
- `next.config.js` or `next.config.ts`
- Potentially `app/layout.tsx`

**Verification:** No debug overlays visible when testing with personas.

---

## RLS Notes

- Slice 1/2 migrations only UPDATE existing records; no new RLS needed
- Slice 5 (Notes): advisor_notes table RLS already exists from data-realization
- Slice 6: assignments table RLS already exists

---

## Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed | Notes |
|------:|------|--------|-----------|-----------|-------|
| 1 | Student profile linking | ⬜ | | | Fix student_user_id for Maya |
| 2 | Advisor-student relationship | ⬜ | | | Fix advisor_id for Maya |
| 3 | Class creation for students | ⬜ | | | Depends on Slice 1 |
| 4 | Assignment creation for advisors | ⬜ | | | Depends on Slice 2 |
| 5 | Notes page implementation | ⬜ | | | All roles |
| 6 | Parent grade display | ⬜ | | | Seed assignments + improve UI |
| 7 | Student selector UX | ⬜ | | | Visual improvements |
| 8 | Form validation + feedback | ⬜ | | | Toasts + validation |
| 9 | Parent navigation | ⬜ | | | Role-specific menu |
| 10 | Remove dev overlays | ⬜ | | | Production polish |

---

## Execution Order

Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

**Dependencies:**
- Slice 3 depends on Slice 1 (student profile must be linked first)
- Slice 4 depends on Slice 2 (advisor-student relationship must exist)
- Slices 5-10 are independent and can be reordered

---

## Verification Checklist (Post-Implementation)

Re-run AI persona testing to verify all fixes:

- [ ] **Maya (Student):** Dashboard loads without errors; can create classes; can view/create assignments; notes page works
- [ ] **Sarah (Parent):** Sees Maya's grades; assignment counts non-zero; student selector obvious; navigation works
- [ ] **Michael (Advisor):** Sees Maya in roster; can create assignments; skill module assign works; notes page works
- [ ] **All personas:** No debug overlays; success confirmations appear; forms validate input

Lesson 25 - Domain Types

Summary
- Added a canonical domain types module and refactored user/course typing to use it.
- Unified advisor/mentor references at the type level and kept teacher as data-only fields.

Canonical types
- app/lib/domain.ts

Updated files
- app/lib/current-user.ts
- app/lib/types.ts
- app/(dash)/[role]/layout.tsx
- app/(dash)/[role]/page.tsx
- components/AdvisorDashboard.tsx
- components/AssignmentModal.tsx
- components/AssignmentsPage.tsx
- components/BottomNavigation.tsx
- components/ClassSetupModal.tsx
- components/LoginScreen.tsx
- components/MentorSkills.tsx
- components/ParentDashboard.tsx
- components/Sidebar.tsx
- components/StudentDashboard.tsx
- components/TopNavigation.tsx
- components/WeeklyPlanner.tsx

Notes
- Mentor/advisor unified under the advisor role.
- Teachers remain data-only entities via teacherName fields.

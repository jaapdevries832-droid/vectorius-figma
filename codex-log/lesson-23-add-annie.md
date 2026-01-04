# Lesson 23 - Annie de Vries Persona

This log documents the additions required to wire the Annie de Vries demo student across login, dashboards, schedules, and roster lists.

---

## Log Entries

### [2025-09-26] - Demo Persona + Schedule Seed
**Description:**
- Added Annie de Vries as a student demo login and persisted the current user on sign-in.
- Wired current user state through the role layout, including logout clearing stored user data.
- Added Annie's seven-class schedule seed and used it when she is the active persona.
- Updated the student dashboard greeting and class list to follow the stored current user.
- Included Annie in advisor, mentor, and parent roster lists with matching performance data.

**Files/Components Updated:**
- app/lib/current-user.ts
- app/(dash)/[role]/layout.tsx
- components/LoginScreen.tsx
- components/WeeklyPlanner.tsx
- components/StudentDashboard.tsx
- components/AdvisorDashboard.tsx
- components/MentorSkills.tsx
- components/ParentDashboard.tsx
- codex-log/lesson-23-add-annie.md

**Notes:**
- Schedule placeholders use Monday-Friday days, "TBD" rooms, and hourly blocks from 08:00 to 16:00 across seven periods.

### [2025-09-26] - App Shell Logo
**Description:**
- Replaced the top-left navigation icon block with the Vectorius logo image.
- Sized the logo responsively and kept header alignment consistent with the role tabs.
- Added a subtle hover effect and linked the logo to the home route.

**Files/Components Updated:**
- components/TopNavigation.tsx
- codex-log/lesson-23-add-annie.md

# Vectorius PRD Pivot Plan 4: Parent Linking, Class Dropdown, Chat Fixes

**Created**: 2026-02-05
**Branch**: lesson-54
**Target**: Fix parent-student linking, class dropdown in assignments, chat persistence, and add parent chat

---

## Key Changes Summary

This plan addresses 4 issues identified during testing:

1. **Parent Dashboard - Linked Student Not Visible** - RLS policies need to use `parent_student_links` table
2. **Assignment Modal - Classes Not in Dropdown** - Ensure student-created classes appear in assignment modal
3. **Chat Persistence** - Messages lost when switching tabs, need localStorage persistence
4. **Parent Chat Interface** - Parents need chat to help children with homework

---

## A) Issues to Address

| # | Issue | Location | Priority |
|---|-------|----------|----------|
| 1 | Parent accepted invite but doesn't see student | `ParentDashboardWrapper.tsx`, RLS | Critical |
| 2 | Classes created in dashboard don't appear in assignment modal | `AssignmentsPage.tsx` | High |
| 3 | Chat messages lost when switching tabs | `ChatInterface.tsx` | High |
| 4 | Parents have no chat interface | `ParentDashboard.tsx` | Medium |

---

## B) 4-Slice Implementation Plan

---

### Slice S4-A: Fix Parent-Student Linking (Critical)

**Goal**: Parents who accept invite codes should see their linked students in the dashboard.

**Root Cause Analysis**:
- Parent invite system creates links in `parent_student_links` table
- But ParentDashboardWrapper queries `students` table directly
- RLS policy on `students` only checks `parent_id = auth.uid()` (old single-parent column)
- RLS does NOT check `parent_student_links` table (new multi-parent junction)

**Issues Addressed**: #1

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_fix_parent_student_rls.sql`

```sql
-- Update students table RLS to also check parent_student_links
-- This allows parents linked via invite codes to see their students

-- Drop existing parent select policy
DROP POLICY IF EXISTS "students_parent_select" ON public.students;

-- Create new policy that checks BOTH parent_id column AND parent_student_links table
CREATE POLICY "students_parent_select" ON public.students
  FOR SELECT USING (
    -- Legacy: direct parent_id match
    parent_id = auth.uid()
    OR
    -- New: via parent_student_links junction table
    id IN (
      SELECT student_id FROM public.parent_student_links
      WHERE parent_id = auth.uid()
    )
  );

-- Also update other parent policies that may need this pattern
-- (assignments, notes, etc.)

-- Fix assignments policy for parents
DROP POLICY IF EXISTS "assignments_parent_select" ON public.assignments;

CREATE POLICY "assignments_parent_select" ON public.assignments
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
      UNION
      SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid()
    )
  );
```

#### Frontend Changes

**Verify**: `components/ParentDashboardWrapper.tsx`
- The `fetchStudents()` function queries `students` table without explicit filter
- RLS should now return students linked via `parent_student_links`
- No code changes needed if RLS fix works
- Test to confirm

#### Acceptance Criteria
- [ ] Migration applies without error
- [ ] `npm run build` passes
- [ ] Parent creates account with invite code
- [ ] Parent logs in and sees linked student in dashboard
- [ ] Multiple parents can see same student
- [ ] Legacy parent_id linkage still works

#### Manual Test Script
1. Login as student (annie)
2. Generate parent invite code
3. Logout
4. Navigate to `/join/parent`
5. Create new parent account with invite code
6. After redirect to `/parent`, verify annie appears in student list
7. Verify parent can view annie's assignments, grades, etc.

---

### Slice S4-B: Classes in Assignment Dropdown

**Goal**: Classes created in student dashboard should appear in assignment modal dropdown.

**Root Cause Analysis**:
- Classes are loaded in `AssignmentsPage.tsx` useEffect on mount
- `fetchStudentScheduleEvents()` queries `student_schedule_events` view
- View joins `student_course_enrollments` with `courses` and `course_meetings`
- Issue: Courses without `course_meetings` entries won't appear (the query uses `!inner` join)
- Student-created courses may not have meeting times set

**Issues Addressed**: #2

#### DB + RLS Changes

**Option A**: Modify the view or create new query that includes courses without meetings
**Option B**: Auto-create a default meeting when creating a course

**New Migration**: `YYYYMMDDHHMMSS_student_courses_view.sql`

```sql
-- Create a simpler view for courses that doesn't require course_meetings
-- This view returns all courses a student is enrolled in, regardless of schedule

CREATE OR REPLACE VIEW public.student_enrolled_courses AS
SELECT
  sce.student_id,
  c.id AS course_id,
  c.title,
  c.teacher_name,
  c.location,
  c.color,
  c.created_by_student_id
FROM public.student_course_enrollments sce
INNER JOIN public.courses c ON c.id = sce.course_id;

-- Grant access
GRANT SELECT ON public.student_enrolled_courses TO authenticated;

-- RLS is inherited from underlying tables
```

#### Frontend Changes

**Modify**: `components/AssignmentsPage.tsx`

1. **Add new fetch function for enrolled courses** (simpler query):
```typescript
const fetchEnrolledCourses = async (): Promise<ScheduledCourse[]> => {
  const { data, error } = await supabase
    .from('student_enrolled_courses')
    .select('course_id, title, teacher_name, location, color')

  if (error || !data) return []

  return data.map(c => ({
    id: c.course_id,
    name: c.title,
    teacherName: c.teacher_name ?? 'Staff',
    room: c.location ?? undefined,
    color: c.color ?? 'bg-blue-500',
    days: [],
    startTime: '',
    endTime: '',
  }))
}
```

2. **Update useEffect to use new function**:
```typescript
useEffect(() => {
  const loadClasses = async () => {
    const { profile } = await getCurrentProfile()
    if (profile?.role !== 'student') {
      setClasses([])
      return
    }

    // Use simpler query that doesn't require course_meetings
    const enrolled = await fetchEnrolledCourses()
    setClasses(enrolled)
  }

  loadClasses()
}, [])
```

**Alternative**: Modify `lib/student-schedule.ts` to use LEFT JOIN instead of INNER JOIN for course_meetings.

#### Acceptance Criteria
- [ ] Migration applies
- [ ] `npm run build` passes
- [ ] Student creates new class in dashboard (without schedule)
- [ ] Navigate to Assignments tab
- [ ] Click "New Assignment"
- [ ] New class appears in dropdown
- [ ] Existing classes with schedules still appear

#### Manual Test Script
1. Login as student
2. Go to dashboard, create new class "Test Class 101"
3. Navigate to Assignments tab
4. Click "New Assignment"
5. Verify "Test Class 101" appears in class dropdown
6. Select it and create assignment
7. Verify assignment shows with correct class

---

### Slice S4-C: Chat Message Persistence

**Goal**: Chat messages should persist when switching tabs and returning.

**Root Cause Analysis**:
- ChatInterface uses useState for messages
- When switching tabs, component unmounts and state is lost
- No localStorage or database persistence

**Issues Addressed**: #3

#### DB + RLS Changes

None required (using localStorage for simplicity).

#### Frontend Changes

**Modify**: `components/ChatInterface.tsx`

1. **Add localStorage persistence for messages**:

```typescript
const CHAT_STORAGE_KEY = 'vectorius_chat_messages';
const CHAT_STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface StoredChat {
  messages: Message[];
  timestamp: number;
}

// Load messages from localStorage on mount
const loadStoredMessages = (): Message[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [];

    const parsed: StoredChat = JSON.parse(stored);

    // Check if expired
    if (Date.now() - parsed.timestamp > CHAT_STORAGE_EXPIRY) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return [];
    }

    // Restore timestamps as Date objects
    return parsed.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));
  } catch {
    return [];
  }
};

// Save messages to localStorage
const saveMessages = (messages: Message[]) => {
  if (typeof window === 'undefined') return;

  const stored: StoredChat = {
    messages,
    timestamp: Date.now()
  };

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
};
```

2. **Update useState initialization**:
```typescript
const [messages, setMessages] = useState<Message[]>(() => {
  const stored = loadStoredMessages();
  if (stored.length > 0) return stored;

  return [{
    id: 'welcome',
    content: "Hello! I'm your AI tutor. What are you working on today?",
    role: 'assistant',
    timestamp: new Date(),
  }];
});
```

3. **Add useEffect to save on change**:
```typescript
useEffect(() => {
  saveMessages(messages);
}, [messages]);
```

4. **Add "Clear Chat" button**:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([{
      id: 'welcome',
      content: "Hello! I'm your AI tutor. What are you working on today?",
      role: 'assistant',
      timestamp: new Date(),
    }]);
  }}
  className="text-xs text-gray-400"
>
  Clear Chat
</Button>
```

#### Acceptance Criteria
- [ ] `npm run build` passes
- [ ] Start chat conversation (2-3 messages)
- [ ] Switch to different tab (Assignments, Schedule, etc.)
- [ ] Return to AI Tutor tab
- [ ] Previous messages still visible
- [ ] Clear Chat button works
- [ ] Messages expire after 24 hours
- [ ] Refresh page - messages persist

#### Manual Test Script
1. Login as student
2. Go to AI Tutor tab
3. Send message "What is 2+2?"
4. Wait for response
5. Click "Assignments" tab
6. Click "AI Tutor" tab again
7. Verify previous conversation is visible
8. Click "Clear Chat" button
9. Verify chat is reset to welcome message
10. Refresh page, verify persistence works

---

### Slice S4-D: Parent Chat Interface

**Goal**: Add AI chat to parent dashboard to help parents assist children with homework.

**Issues Addressed**: #4

#### DB + RLS Changes

None required (reusing existing chat API).

#### Frontend Changes

**Create**: `components/ParentChatInterface.tsx`

Based on `ChatInterface.tsx` with modifications:
- Different welcome message: "Hello! I'm here to help you support your child's learning."
- Parent-specific quick prompts:
  - "How can I help my child with homework?"
  - "Explain this math concept simply"
  - "Study tips for my child"
  - "How to encourage good study habits"
- Different localStorage key: `vectorius_parent_chat_messages`
- Same mode options (Tutor, Checker, Explainer)
- Simpler header (no curiosity badge - that's student gamification)

**Modify**: `components/ParentDashboard.tsx`

1. **Add AI Chat tab** to the parent dashboard navigation
2. **Import and render** ParentChatInterface

**Modify**: `app/(dash)/[role]/layout.tsx`

1. **Add 'ai-chat' to parent menu items**
2. **Render ParentChatInterface for parent role**

#### File Structure

```
components/
├── ChatInterface.tsx          # Student chat (existing)
├── ParentChatInterface.tsx    # Parent chat (new)
└── shared/
    └── ChatCore.tsx           # (optional) shared chat logic
```

#### Acceptance Criteria
- [ ] `npm run build` passes
- [ ] Login as parent
- [ ] "AI Assistant" tab visible in sidebar
- [ ] Click tab - chat interface appears
- [ ] Send message - get response
- [ ] Quick prompts show parent-relevant suggestions
- [ ] Mode dropdown works
- [ ] Messages persist when switching tabs

#### Manual Test Script
1. Login as parent
2. Verify "AI Assistant" (or "AI Chat") tab in sidebar
3. Click the tab
4. Verify chat interface loads with parent-specific welcome
5. Open quick prompts dropdown
6. Verify parent-focused prompts appear
7. Send message "How can I help my child with fractions?"
8. Verify response received
9. Switch to another tab, return
10. Verify conversation persisted

---

## C) Dependencies & Sequencing

```
S4-A (Parent Linking RLS) ──────────────────────────────────┐
                                                             │
S4-B (Classes Dropdown) ────────────────────────────────────┤
                                                             │
S4-C (Chat Persistence) ────────────────────────────────────┤
                                                             │
S4-D (Parent Chat) ─────── depends on S4-C for persistence ─┘
```

**Recommended Execution Order:**
1. **S4-A** - Critical bug fix for parent invite system
2. **S4-B** - High priority UX fix
3. **S4-C** - Required before S4-D
4. **S4-D** - Depends on S4-C persistence pattern

---

## D) Files to Modify Summary

| Slice | New Files | Modified Files | Migrations |
|-------|-----------|----------------|------------|
| S4-A | - | - (RLS only) | 1 migration |
| S4-B | - | `components/AssignmentsPage.tsx` | 1 migration (view) |
| S4-C | - | `components/ChatInterface.tsx` | - |
| S4-D | `components/ParentChatInterface.tsx` | `app/(dash)/[role]/layout.tsx` | - |

---

## E) Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed | Notes |
|---:|---|---|---|---|---|
| S4-A | Fix Parent-Student Linking | ✅ | 20260205212110 | 2026-02-05 | RLS migration |
| S4-B | Classes in Assignment Dropdown | ✅ | 20260205212311 | 2026-02-05 | View + query update |
| S4-C | Chat Message Persistence | ✅ | - | 2026-02-05 | localStorage |
| S4-D | Parent Chat Interface | ✅ | - | 2026-02-05 | New component |

---

## F) Verification Checklist (Per Slice)

Each slice must pass before commit:

- [ ] `supabase db push` succeeds (if migration)
- [ ] `supabase db pull` confirms sync (if migration)
- [ ] `supabase migration list` shows aligned (if migration)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test script executed successfully
- [ ] Commit message: `slice S4-X: <description>`
- [ ] Co-Authored-By included
- [ ] Slice marked ✅ in tracker

---

## G) What We Are NOT Doing

- Full database persistence for chat (using localStorage for now)
- Chat history syncing across devices
- Parent-to-student chat messaging
- AI analysis of student's performance for parents
- Conversation threading or topics
- Export chat history feature

---

## H) Agent Correction Checklist

### Before Each Slice
- [ ] Confirmed branch is `lesson-54`
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

# Vectorius PRD Pivot Plan 3: UI/UX Improvements & New Features

**Created**: 2026-02-02
**Branch**: lesson-54
**Target**: Remove demo functionality, add parent invites, improve assignments, AI chat, and achievements

---

## Key Changes Summary

This plan addresses 6 areas of improvement:

1. **Remove Demo Buttons** - Clean up login page, delete demo page
2. **Parent Invite System** - Students can invite parents via codes (multi-parent support)
3. **Assignment Modal** - Type dropdown, color picker, better preview layout
4. **Assignments Page** - Delete functionality, remove points badge, fix due date display
5. **AI Chat** - Move mode to header dropdown, remove gamification banner, quick prompts dropdown
6. **Custom Goals** - Allow students/parents/advisors to set point goals for rewards

---

## A) Issues to Address

| # | Issue | Location | Priority |
|---|-------|----------|----------|
| 1 | Demo buttons on login page | `app/login/page.tsx` | High |
| 2 | Demo page exists | `app/parent-demo/page.tsx` | High |
| 3 | No parent invite system | Missing | High |
| 4 | Assignment type is button grid (should be dropdown) | `AssignmentModal.tsx` | Medium |
| 5 | No color selection for assignments | `AssignmentModal.tsx` | Medium |
| 6 | Assignment preview squeezed in right column | `AssignmentModal.tsx` | Medium |
| 7 | Delete button non-functional | `AssignmentsPage.tsx` | High |
| 8 | "+0 pts" badge is distracting | `AssignmentsPage.tsx` | Medium |
| 9 | Due date shows full date for today's items | `AssignmentsPage.tsx` | Low |
| 10 | "Earn points for asking questions!" banner | `ChatInterface.tsx` | Medium |
| 11 | Mode selector is buttons (should be dropdown) | `ChatInterface.tsx` | Medium |
| 12 | Quick prompts are buttons (should be dropdown) | `ChatInterface.tsx` | Medium |
| 13 | Math prompts don't suggest sample problems | `prompts/*.md` | Low |
| 14 | No custom goals/awards in achievements | `AchievementsPage.tsx` | Medium |

---

## B) 6-Slice Implementation Plan

---

### Slice S3-A: Remove Demo Buttons and Demo Page

**Goal**: Clean up the login page by removing demo-related functionality.

**Issues Addressed**: #1, #2

#### DB + RLS Changes
None required.

#### Frontend Changes

**Delete**: `app/parent-demo/page.tsx`
- Remove entire file

**Modify**: `app/login/page.tsx`
- Lines 64-68: Remove `handleDemoParentPrefill()` function
- Lines 70-72: Remove `handleOpenParentDemo()` function
- Lines 175-181: Remove "Demo Parent Login (Prefill)" button
- Lines 182-188: Remove "Open Parent Demo Dashboard (No Sign-In)" button

#### Acceptance Criteria
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Navigate to `/login` - no demo buttons visible
- [ ] Navigate to `/parent-demo` - returns 404

#### Manual Test Script
1. Navigate to `/login`
2. Verify only Sign In/Sign Up toggle, email/password fields, and "I have an invite code" link visible
3. Verify no "Demo Parent Login" or "Open Parent Demo Dashboard" buttons
4. Navigate to `/parent-demo` - verify 404 page

---

### Slice S3-B: Parent Invite System (Multi-Parent Support)

**Goal**: Allow students to generate invite codes for parents. Supports multiple parents per student.

**Issues Addressed**: #3 - No parent invite system

#### DB + RLS Changes

**New Migration 1**: `YYYYMMDDHHMMSS_parent_student_links.sql`

```sql
-- Junction table for many-to-many parent-student relationships
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text DEFAULT 'parent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON public.parent_student_links(student_id);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Parents can read their links
CREATE POLICY "parents_read_own_links" ON public.parent_student_links
  FOR SELECT USING (parent_id = auth.uid());

-- Students can read links to them
CREATE POLICY "students_read_own_links" ON public.parent_student_links
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE student_user_id = auth.uid()
    )
  );
```

**New Migration 2**: `YYYYMMDDHHMMSS_parent_invites.sql`

```sql
CREATE TABLE IF NOT EXISTS public.parent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_invites_code ON public.parent_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_parent_invites_student ON public.parent_invites(student_id);

ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;

-- Students can manage invites for themselves
CREATE POLICY "students_manage_own_invites" ON public.parent_invites
  FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  );

-- Anyone authenticated can read by code (for validation)
CREATE POLICY "authenticated_read_invites" ON public.parent_invites
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function to accept parent invite
CREATE OR REPLACE FUNCTION public.accept_parent_invite(invite_code_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record record;
BEGIN
  SELECT * INTO invite_record
  FROM public.parent_invites
  WHERE upper(invite_code) = upper(invite_code_input)
  FOR UPDATE;

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF invite_record.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Update invite as accepted
  UPDATE public.parent_invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = invite_record.id;

  -- Create parent-student link
  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (auth.uid(), invite_record.student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  -- Update user's role to parent if not already set
  UPDATE public.profiles
  SET role = 'parent'
  WHERE id = auth.uid() AND (role IS NULL OR role = 'student');

  RETURN invite_record.student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_parent_invite(text) TO authenticated;
```

#### Frontend Changes

**New File**: `app/join/parent/page.tsx`
- Parent join page following pattern from `/join` (student invites)
- Auth mode toggle (sign-up / sign-in)
- 8-character invite code input
- Email/password fields
- Calls `accept_parent_invite` RPC on submit
- Redirects to `/parent` on success

**New File**: `components/ParentInviteModal.tsx`
- Modal for students to generate parent invite codes
- Generate code button (8-char uppercase alphanumeric)
- Display code with copy-to-clipboard
- Show expiration (7 days)
- Optional: Email invite functionality

**Modify**: `components/StudentDashboard.tsx`
- Add "Invite Parent" button in profile/settings section
- Add state for invite modal
- Add handler to generate invite code via Supabase insert

**Modify**: `app/login/page.tsx`
- Add link: "Parent with invite code? Join here" pointing to `/join/parent`

**Modify**: RLS policies that use `students.parent_id`
- Update to also check `parent_student_links` table for parent access

#### Acceptance Criteria
- [ ] Migrations apply without error
- [ ] `npm run build` passes
- [ ] Student can generate parent invite code from dashboard
- [ ] Code shows with expiration date and copy button
- [ ] Parent navigates to `/join/parent`
- [ ] Parent enters code, creates account
- [ ] Parent gets linked via `parent_student_links` table
- [ ] Parent redirected to `/parent` dashboard
- [ ] Parent can see linked student
- [ ] Multiple parents can link to same student

#### Manual Test Script
1. Login as student (annie)
2. Find "Invite Parent" button on dashboard
3. Click to open modal, generate code
4. Copy the 8-character code
5. Logout
6. Navigate to `/join/parent`
7. Enter the code
8. Create new parent account
9. Verify redirect to parent dashboard
10. Verify annie appears as linked student
11. Repeat steps 5-10 with different email (second parent)
12. Verify both parents can see annie

---

### Slice S3-C: Assignment Modal Improvements

**Goal**: Convert type to dropdown, add color picker, move preview below form.

**Issues Addressed**: #4, #5, #6

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_assignments_color.sql`

```sql
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS color text;
COMMENT ON COLUMN public.assignments.color IS 'Custom color for assignment display (Tailwind class e.g. bg-blue-500)';
```

#### Frontend Changes

**Modify**: `components/AssignmentModal.tsx`

1. **Update Interface** (line 24-30):
```typescript
export interface AssignmentInput {
  title: string
  type: AssignmentType
  classId: string
  dueDate: string
  notes?: string
  color?: string  // NEW
}
```

2. **Type Selector** (lines 162-183):
- Replace 2x2 button grid with `<Select>` dropdown
- Each option shows icon + label

```tsx
<Select value={form.type} onValueChange={(val) => setForm(prev => ({ ...prev, type: val as AssignmentType }))}>
  <SelectTrigger className="rounded-xl border-gray-200 bg-white/80">
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="rounded-xl">
    {typeOptions.map(opt => {
      const Icon = opt.icon
      return (
        <SelectItem key={opt.key} value={opt.key}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${opt.color}`} />
            {opt.label}
          </div>
        </SelectItem>
      )
    })}
  </SelectContent>
</Select>
```

3. **Add Color Picker** (after Type field):
- Grid of color swatches
- Colors: gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose
- Each swatch is a small circle button
- Selected color has ring indicator

```tsx
const colorOptions = [
  { key: 'bg-gray-500', label: 'Gray' },
  { key: 'bg-red-500', label: 'Red' },
  { key: 'bg-orange-500', label: 'Orange' },
  { key: 'bg-amber-500', label: 'Amber' },
  { key: 'bg-yellow-500', label: 'Yellow' },
  { key: 'bg-lime-500', label: 'Lime' },
  { key: 'bg-green-500', label: 'Green' },
  { key: 'bg-emerald-500', label: 'Emerald' },
  { key: 'bg-teal-500', label: 'Teal' },
  { key: 'bg-cyan-500', label: 'Cyan' },
  { key: 'bg-blue-500', label: 'Blue' },
  { key: 'bg-indigo-500', label: 'Indigo' },
  { key: 'bg-violet-500', label: 'Violet' },
  { key: 'bg-purple-500', label: 'Purple' },
  { key: 'bg-fuchsia-500', label: 'Fuchsia' },
  { key: 'bg-pink-500', label: 'Pink' },
  { key: 'bg-rose-500', label: 'Rose' },
]
```

4. **Layout Change** (line 112):
- Change from `grid md:grid-cols-2` to single column
- Form fields first, preview below
- Preview gets full width

5. **Preview Section** (lines 218-248):
- Move to below form
- Make full width
- Show selected color in icon background
- Add more padding for readability

**Modify**: `components/AssignmentsPage.tsx`
- Update `addAssignment` to include color in insert
- Update `renderAssignment` to use custom color if set (fallback to type color)

#### Acceptance Criteria
- [ ] Migration applies
- [ ] `npm run build` passes
- [ ] Type is now a dropdown (not buttons)
- [ ] Color picker shows 17 color swatches
- [ ] Selected color has visual indicator
- [ ] Preview appears below form (not squeezed right)
- [ ] Preview shows selected color
- [ ] Created assignment saves with color
- [ ] Assignment list shows custom color

#### Manual Test Script
1. Login as student
2. Go to Assignments page
3. Click "Add Assignment"
4. Verify type is a dropdown - click to see options
5. Verify color picker grid appears
6. Select a color (e.g., purple)
7. Fill in title, select class, set due date
8. Verify preview is below form with more space
9. Verify preview shows selected color
10. Save assignment
11. Verify assignment appears in list with selected color

---

### Slice S3-D: Assignments Page Fixes

**Goal**: Enable delete, remove points badge, improve due date display.

**Issues Addressed**: #7, #8, #9

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_students_delete_assignments.sql`

```sql
-- Allow students to delete their own assignments
CREATE POLICY "students_delete_own_assignments" ON public.assignments
  FOR DELETE USING (
    student_id IN (
      SELECT id FROM public.students
      WHERE student_user_id = auth.uid()
    )
  );
```

#### Frontend Changes

**Modify**: `components/AssignmentsPage.tsx`

1. **Add Delete Handler** (near other handlers):
```typescript
const handleDeleteAssignment = async (assignmentId: string) => {
  if (!confirm("Delete this assignment? This cannot be undone.")) return;

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    // Show error toast
    return;
  }

  setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  // Show success toast
};
```

2. **Wire Delete Button** (line 833):
```tsx
<Button
  variant="ghost"
  size="sm"
  className="p-2 h-auto rounded-xl hover:bg-gray-100"
  onClick={() => handleDeleteAssignment(a.id)}
>
  <Trash2 className="w-4 h-4 text-red-600" />
</Button>
```

3. **Remove Points Badge** (lines 733-742):
- Delete the entire block showing "+X pts" in top-right corner
- This removes the distracting "+0 pts" display

4. **Improve Due Date Display** (lines 778-780):
- Create helper function for formatting:

```typescript
function formatDueDisplay(dueAt: string | null): string {
  if (!dueAt) return 'No due date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() === today.getTime()) {
    return 'due today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (due.getTime() === yesterday.getTime()) {
    return 'due yesterday';
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due.getTime() === tomorrow.getTime()) {
    return 'due tomorrow';
  }

  return `Due ${due.toLocaleDateString()}`;
}
```

- Replace existing due date display with `{formatDueDisplay(a.dueAt)}`

#### Acceptance Criteria
- [ ] Migration applies
- [ ] `npm run build` passes
- [ ] Delete button shows confirmation dialog
- [ ] Delete removes assignment from database
- [ ] Delete updates UI immediately
- [ ] No points badge visible on assignment cards
- [ ] Items due today show "due today"
- [ ] Items due yesterday show "due yesterday"
- [ ] Items due tomorrow show "due tomorrow"
- [ ] Other dates show full format

#### Manual Test Script
1. Login as student
2. Go to Assignments page
3. Verify no "+0 pts" or "+10 pts" badges on cards
4. Hover over an assignment - verify trash icon appears
5. Click trash icon
6. Verify confirmation dialog
7. Confirm deletion
8. Verify assignment removed from list
9. Create assignment due today
10. Verify it shows "due today" (not full date)
11. Check overdue item shows "due yesterday" or date

---

### Slice S3-E: AI Chat Improvements

**Goal**: Clean up gamification, move mode to header dropdown, convert quick prompts to dropdown, update math prompts.

**Issues Addressed**: #10, #11, #12, #13

#### DB + RLS Changes
None required.

#### Frontend Changes

**Modify**: `components/ChatInterface.tsx`

1. **Remove Gamification Banner** (lines 151-172):
- Delete the entire `<div className="px-4 pt-4">` block containing "Earn points for asking questions!"

2. **Update Header** (lines 140-148):
- Add mode dropdown to header bar
- Add compact curiosity badge progress (X/10)

```tsx
<CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
  <CardTitle className="flex items-center gap-2">
    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
      <Bot className="w-5 h-5" />
    </div>
    <span>AI Tutor</span>

    {/* Mode dropdown */}
    <Select
      value={mode}
      onValueChange={(val) => {
        setMode(val as Mode);
        localStorage.setItem('chatMode', val);
      }}
    >
      <SelectTrigger className="w-28 ml-4 bg-white/20 border-white/30 text-white text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tutor">Tutor</SelectItem>
        <SelectItem value="checker">Checker</SelectItem>
        <SelectItem value="explainer">Explainer</SelectItem>
      </SelectContent>
    </Select>

    {/* Curiosity badge - compact */}
    <div className="ml-auto flex items-center gap-1.5 text-sm bg-white/20 px-2 py-1 rounded-lg">
      <Sparkles className="w-3.5 h-3.5" />
      <span>{Math.min(messages.filter(m => m.role === 'user').length, 10)}/10</span>
    </div>
  </CardTitle>
</CardHeader>
```

3. **Remove Mode Selector Section** (lines 174-202):
- Delete the separate mode buttons bar (now in header)

4. **Convert Quick Prompts to Dropdown** (lines 280-298):
```tsx
{messages.length === 1 && (
  <div className="p-4 border-t bg-gray-50">
    <Select
      value=""
      onValueChange={(prompt) => { if (prompt) setInputValue(prompt); }}
    >
      <SelectTrigger className="w-full text-left">
        <SelectValue placeholder="Try asking about..." />
      </SelectTrigger>
      <SelectContent>
        {quickPrompts.map((prompt, index) => (
          <SelectItem key={index} value={prompt}>
            {prompt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

5. **Add imports**:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
```

**Modify**: `prompts/tutor_mode.md`
- Add after Protocol section:

```markdown
## Math-Specific Guidance

When the student is working on math problems:
- Offer to provide a similar sample problem (with different numbers) to illustrate the technique
- Show ONE step of your sample solution, then pause
- Ask: "Would you like me to work through a quick example first?"
- Keep sample problems simpler than the student's actual problem
```

**Modify**: `prompts/explainer_mode.md`
- Add after Protocol section:

```markdown
## Math-Specific Guidance

When explaining math concepts:
- Always include a mini worked example (NOT the student's problem)
- Use simple numbers in your example
- Format the example clearly with steps
- Offer: "Want me to show you with a sample problem?"
```

#### Acceptance Criteria
- [ ] `npm run build` passes
- [ ] Gamification banner ("Earn points...") is gone
- [ ] Mode selector is dropdown in purple header bar
- [ ] Curiosity progress shows compactly in header (X/10)
- [ ] Quick prompts are dropdown (not buttons)
- [ ] Clicking quick prompt fills input
- [ ] Math questions trigger sample problem suggestions

#### Manual Test Script
1. Login as student
2. Go to AI Chat
3. Verify no "Earn points for asking questions!" banner
4. Verify header shows: AI Tutor | [Mode dropdown] | [X/10]
5. Click mode dropdown - verify options
6. Switch modes - verify persists on refresh
7. Verify "Try asking about..." is a dropdown
8. Click dropdown, select an option
9. Verify input field populated
10. Ask a math question: "How do I solve 2x + 5 = 15?"
11. Verify AI suggests/offers sample problem in response

---

### Slice S3-F: Custom Goals/Awards (Achievements Enhancement)

**Goal**: Allow students, parents, and advisors to create custom point goals.

**Issues Addressed**: #14

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_student_goals.sql`

```sql
-- Custom student goals/awards
CREATE TABLE IF NOT EXISTS public.student_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_points integer NOT NULL CHECK (target_points > 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_by_role text NOT NULL,
  achieved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_goals_student ON public.student_goals(student_id);

ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

-- Students can manage their own goals
CREATE POLICY "students_own_goals_select" ON public.student_goals
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  );

CREATE POLICY "students_own_goals_insert" ON public.student_goals
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  );

CREATE POLICY "students_own_goals_update" ON public.student_goals
  FOR UPDATE USING (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  );

CREATE POLICY "students_own_goals_delete" ON public.student_goals
  FOR DELETE USING (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  );

-- Parents can manage goals for their children (via parent_student_links)
CREATE POLICY "parents_children_goals" ON public.student_goals
  FOR ALL USING (
    student_id IN (
      SELECT student_id FROM public.parent_student_links
      WHERE parent_id = auth.uid()
    )
    OR student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT student_id FROM public.parent_student_links
      WHERE parent_id = auth.uid()
    )
    OR student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

-- Advisors can manage goals for assigned students
CREATE POLICY "advisors_assigned_goals" ON public.student_goals
  FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE advisor_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE advisor_id = auth.uid())
  );
```

#### Frontend Changes

**Modify**: `components/AchievementsPage.tsx`

1. **Add State** (near other state):
```typescript
type Goal = {
  id: string;
  name: string;
  description: string | null;
  targetPoints: number;
  achievedAt: string | null;
  createdByRole: string;
};

const [goals, setGoals] = useState<Goal[]>([]);
const [showGoalForm, setShowGoalForm] = useState(false);
const [newGoalName, setNewGoalName] = useState("");
const [newGoalDescription, setNewGoalDescription] = useState("");
const [newGoalTarget, setNewGoalTarget] = useState("");
```

2. **Add Goals Loading** (in loadData):
```typescript
const { data: goalsData } = await supabase
  .from("student_goals")
  .select("*")
  .eq("student_id", studentId)
  .is("achieved_at", null)
  .order("created_at", { ascending: false });

setGoals(goalsData?.map(g => ({
  id: g.id,
  name: g.name,
  description: g.description,
  targetPoints: g.target_points,
  achievedAt: g.achieved_at,
  createdByRole: g.created_by_role,
})) ?? []);
```

3. **Add Goal Handlers**:
```typescript
const handleCreateGoal = async () => {
  const target = parseInt(newGoalTarget);
  if (!newGoalName.trim() || isNaN(target) || target <= 0) {
    alert("Please enter a valid goal name and target points.");
    return;
  }

  const { error } = await supabase
    .from("student_goals")
    .insert({
      student_id: studentId,
      name: newGoalName.trim(),
      description: newGoalDescription.trim() || null,
      target_points: target,
      created_by: user.id,
      created_by_role: 'student',
    });

  if (error) {
    alert(error.message);
    return;
  }

  setNewGoalName("");
  setNewGoalDescription("");
  setNewGoalTarget("");
  setShowGoalForm(false);
  loadData();
};

const handleDeleteGoal = async (goalId: string) => {
  if (!confirm("Delete this goal?")) return;

  const { error } = await supabase
    .from("student_goals")
    .delete()
    .eq("id", goalId);

  if (error) {
    alert(error.message);
    return;
  }

  setGoals(prev => prev.filter(g => g.id !== goalId));
};
```

4. **Update Tabs** (line 206):
```tsx
<TabsList className="grid w-full grid-cols-3 rounded-2xl">
  <TabsTrigger value="badges">Badges</TabsTrigger>
  <TabsTrigger value="rewards">Rewards</TabsTrigger>
  <TabsTrigger value="goals">Goals</TabsTrigger>
</TabsList>
```

5. **Add Goals Tab Content** (after rewards tab):
```tsx
<TabsContent value="goals" className="mt-4">
  <div className="mb-4">
    <Button
      onClick={() => setShowGoalForm(!showGoalForm)}
      className="rounded-xl bg-gradient-primary text-white"
    >
      <Plus className="w-4 h-4 mr-2" /> Add Goal
    </Button>
  </div>

  {showGoalForm && (
    <Card className="mb-6 rounded-2xl border-0 shadow-md p-6">
      <h3 className="font-semibold mb-4">Create New Goal</h3>
      <div className="space-y-4">
        <div>
          <Label>Goal Name</Label>
          <Input
            placeholder="e.g., Buy new ski goggles"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input
            placeholder="What are you saving for?"
            value={newGoalDescription}
            onChange={(e) => setNewGoalDescription(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div>
          <Label>Target Points</Label>
          <Input
            type="number"
            placeholder="500"
            value={newGoalTarget}
            onChange={(e) => setNewGoalTarget(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateGoal} className="rounded-xl bg-gradient-primary text-white">
            Create Goal
          </Button>
          <Button variant="outline" onClick={() => setShowGoalForm(false)} className="rounded-xl">
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  )}

  {goals.length === 0 && !showGoalForm ? (
    <Card className="rounded-2xl border-0 shadow-md p-8 text-center">
      <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <p className="text-gray-600">No goals yet. Create one to track your progress!</p>
    </Card>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map((g) => {
        const progress = Math.min((points / g.targetPoints) * 100, 100);
        const achieved = points >= g.targetPoints;
        return (
          <Card key={g.id} className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <span className="truncate">{g.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => handleDeleteGoal(g.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {g.description && (
                <p className="text-sm text-gray-600 mb-3">{g.description}</p>
              )}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{points} / {g.targetPoints} pts</span>
                  {achieved && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      Achieved!
                    </Badge>
                  )}
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  )}
</TabsContent>
```

6. **Add imports**:
```typescript
import { Target, Plus, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
```

#### Acceptance Criteria
- [ ] Migration applies
- [ ] `npm run build` passes
- [ ] Goals tab appears in Achievements page
- [ ] "Add Goal" button opens form
- [ ] Can enter name, description, target points
- [ ] Goal saves to database
- [ ] Goal appears in list with progress bar
- [ ] Progress shows current points / target
- [ ] "Achieved!" badge shows when points >= target
- [ ] Can delete goals
- [ ] Empty state shows when no goals

#### Manual Test Script
1. Login as student
2. Go to Achievements
3. Click "Goals" tab
4. Verify empty state message
5. Click "Add Goal"
6. Enter: "Buy new ski goggles", "For the ski trip", "500"
7. Click Create Goal
8. Verify goal appears with progress bar
9. Verify shows "X / 500 pts"
10. If points >= 500, verify "Achieved!" badge
11. Click trash icon on goal
12. Confirm deletion
13. Verify goal removed

---

## C) Dependencies & Sequencing

```
S3-A (Demo Removal) ─────────────────────────────────────────────────────┐
                                                                          │
S3-B (Parent Invites) ───────────────────────────────────────────────────┤
                                                                          │
S3-C (Assignment Modal) ─────────────────────────────────────────────────┤
                                                                          │
S3-D (Assignments Page) ─────────────────────────────────────────────────┤
                                                                          │
S3-E (AI Chat) ──────────────────────────────────────────────────────────┤
                                                                          │
S3-F (Custom Goals) ─────────────────────────────────────────────────────┘
```

**Note**: S3-F depends on S3-B if using `parent_student_links` table for parent RLS. Otherwise, all slices are independent.

**Recommended Execution Order:**
1. S3-A (quick cleanup)
2. S3-D (fixes existing broken functionality)
3. S3-C (improves existing modal)
4. S3-E (cleans up chat UI)
5. S3-F (adds new feature)
6. S3-B (largest new feature)

---

## D) Files to Modify Summary

| Slice | New Files | Modified Files | Migrations |
|-------|-----------|----------------|------------|
| S3-A | - | `app/login/page.tsx` | - |
| S3-A | (delete) `app/parent-demo/page.tsx` | - | - |
| S3-B | `app/join/parent/page.tsx`, `components/ParentInviteModal.tsx` | `components/StudentDashboard.tsx`, `app/login/page.tsx`, RLS policies | 2 migrations |
| S3-C | - | `components/AssignmentModal.tsx`, `components/AssignmentsPage.tsx` | 1 migration |
| S3-D | - | `components/AssignmentsPage.tsx` | 1 migration |
| S3-E | - | `components/ChatInterface.tsx`, `prompts/tutor_mode.md`, `prompts/explainer_mode.md` | - |
| S3-F | - | `components/AchievementsPage.tsx` | 1 migration |

---

## E) Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed | Notes |
|---:|---|---|---|---|---|
| S3-A | Remove Demo Buttons | ⬜ | - | - | Quick cleanup |
| S3-B | Parent Invite System | ⬜ | - | - | Multi-parent support |
| S3-C | Assignment Modal | ⬜ | - | - | Type dropdown, colors, preview |
| S3-D | Assignments Page Fixes | ⬜ | - | - | Delete, no points badge |
| S3-E | AI Chat Improvements | ⬜ | - | - | Mode dropdown, prompts |
| S3-F | Custom Goals | ⬜ | - | - | New achievements feature |

---

## F) Verification Checklist (Per Slice)

Each slice must pass before commit:

- [ ] `supabase db push` succeeds (if migration)
- [ ] `supabase db pull` confirms sync (if migration)
- [ ] `supabase migration list` shows aligned (if migration)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test script executed successfully
- [ ] Commit message: `slice S3-X: <description>`
- [ ] Co-Authored-By included
- [ ] Slice marked ✅ in tracker

---

## G) What We Are NOT Doing

- Real-time notifications for parent invites (page refresh to see)
- Parent dashboard redesign
- Assignment color affecting any analytics/reports
- Full chat conversation history persistence
- AI-powered goal suggestions
- Streak tracking for goals
- Goal sharing between students

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

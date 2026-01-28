# Vectorius PRD Pivot: Sprint 1 - Pilot Onboarding + Role Plumbing

**Created**: 2026-01-27
**Branch**: lesson-53
**Target**: Invite a family + advisor and have everyone land in the right place with the right permissions

---

## Key Decisions (User Confirmed)

| Decision | Choice |
|----------|--------|
| Parent signup | Self-register (no invite codes needed) |
| Student signup | Invite-only (already implemented in Plan 1) |
| Advisor signup | Invite codes from existing advisors |
| Consent capture location | First dashboard visit (profile completion gate) |
| Timezone location | `profiles.timezone` field |

---

## A) Repo Recon Summary

### Current State (Post Plan 1)

#### Already Implemented
| Feature | Status | Location |
|---------|--------|----------|
| Student invite codes | Done | `student_invites` table, `/join` page, `InviteCodeModal.tsx` |
| Role system | Done | `app_role` enum (parent, student, advisor, admin) |
| Role-based routing | Done | `/[role]` with verification in layout |
| Profiles table | Done | id, role, first_name, last_name, avatar_url |
| Students table | Done | parent_id, student_user_id, advisor_id, grade, school_name |
| Advisor dashboard | Done | `AdvisorDashboard.tsx`, `advisor_student_summary` view |
| Task provenance | Done | `task_source` enum, `created_by_role` on assignments |
| Parent signals | Done | `parent_student_signals` view |
| Calendar events | Done | `calendar_events` table |

#### Database Schema (Key Tables from Plan 1)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User identity + role | `id`, `role`, `first_name`, `last_name`, `email` |
| `students` | Student records | `id`, `parent_id`, `student_user_id`, `advisor_id`, `grade` |
| `student_invites` | Student invite codes | `parent_id`, `student_id`, `invite_code`, `expires_at` |
| `advisor_profiles` | Advisor details | `user_id`, `bio`, `specialties[]` |

---

### Gaps vs Sprint 1 Requirements

| Sprint 1 Requirement | Current State | Gap |
|---------------------|---------------|-----|
| **Profile completion gate** | Users can access dashboard immediately | Need `onboarding_completed_at` + gate UI |
| **Consent/house rules** | No consent tracking | Need `user_consents` table + house rules modal |
| **Advisor invite codes** | Only student invites exist | Need `advisor_invites` table + `/join/advisor` |
| **Timezone field** | Not in profiles table | Need `profiles.timezone` column |
| **Minimal profile fields** | grade/school on students only | Need timezone on all profiles |

---

## B) 5-Slice Implementation Plan

---

### Slice S1-A: Profile Completion Infrastructure

**Goal**: Add database fields for profile completion tracking and consent.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_profile_completion_consent.sql`

```sql
-- Profile completion fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Consent tracking table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type text NOT NULL, -- 'ai_coach_rules', 'terms_of_service', 'privacy_policy'
  consent_version text NOT NULL DEFAULT '1.0',
  consented_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (user_id, consent_type)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own consents
CREATE POLICY "user_consents_own" ON public.user_consents
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Subjects on students (optional quick reference)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS preferred_subjects text[];
```

#### Backend Changes
- None (infrastructure only)

#### Frontend Changes
- None (infrastructure only)

#### Acceptance Criteria
- [ ] Migration applies cleanly
- [ ] `user_consents` table has RLS enabled
- [ ] `profiles` has new columns: timezone, profile_completed_at, onboarding_completed_at
- [ ] `students` has preferred_subjects array column
- [ ] `supabase db push/pull/list` succeed

#### Manual Test Script
1. Run `supabase migration new profile_completion_consent`
2. Add SQL to migration file
3. Run `supabase db push`
4. Verify tables/columns exist in Supabase Studio
5. Test RLS by inserting/selecting consents as authenticated user
6. Run `supabase db pull` and `supabase migration list`

#### Notes/Risks
- This is infrastructure only; no user-facing changes
- v2: Add consent versioning for GDPR compliance

---

### Slice S1-B: Profile Completion Gate UI

**Goal**: Gate dashboard access until profile is completed and consent given.

#### DB + RLS Changes
- None (uses S1-A infrastructure)

#### Backend Changes
- Server action: `completeOnboarding({ firstName, lastName, timezone, consentTypes[] })`
- Updates `profiles.onboarding_completed_at` and inserts `user_consents` records

#### Frontend Changes
- **New component**: `components/ProfileCompletionGate.tsx`
  - Wrapper component that checks `profile.onboarding_completed_at`
  - If null, shows ProfileCompletionModal
  - Once complete, renders children (dashboard)

- **New component**: `components/ProfileCompletionModal.tsx`
  - Multi-step modal (cannot be dismissed without completing):
    - Step 1: Basic info (first_name, last_name, timezone)
    - Step 2: House rules consent checkbox + submit
  - Role-specific required fields:
    - **Student**: first_name, timezone, AI coach consent
    - **Parent**: first_name, timezone, AI coach consent + terms
    - **Advisor**: first_name, last_name, timezone, consent

- **New component**: `components/TimezoneSelect.tsx`
  - Dropdown with common timezones
  - Auto-detect from browser as default (`Intl.DateTimeFormat().resolvedOptions().timeZone`)

- **Modify**: `app/(dash)/[role]/page.tsx`
  - Wrap dashboard components with `ProfileCompletionGate`

#### Acceptance Criteria
- [ ] New users see modal on first dashboard visit
- [ ] Modal cannot be dismissed without completing all required fields
- [ ] Timezone auto-detected from browser
- [ ] `onboarding_completed_at` set after completion
- [ ] Consent record saved to `user_consents` table
- [ ] Subsequent visits go directly to dashboard

#### Manual Test Script
1. Create new user via signup (any role)
2. Navigate to dashboard
3. Verify modal appears with Step 1 (name + timezone)
4. Complete Step 1, proceed to Step 2
5. Read house rules, check consent box
6. Submit and verify dashboard loads
7. Refresh page - modal should NOT appear again
8. Check database: `onboarding_completed_at` is set, consent record exists

#### Notes/Risks
- Must not block existing users who already completed informal onboarding
- Consider: Should existing users be prompted to complete consent retroactively?

---

### Slice S1-C: Advisor Invite System

**Goal**: Allow existing advisors to invite new advisors via codes.

#### DB + RLS Changes

**New Migration**: `YYYYMMDDHHMMSS_advisor_invites.sql`

```sql
-- Create advisor invites table
CREATE TABLE IF NOT EXISTS public.advisor_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  email text, -- optional: pre-specify email
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_invites_code ON public.advisor_invites(invite_code);

ALTER TABLE public.advisor_invites ENABLE ROW LEVEL SECURITY;

-- Only advisors/admins can create invites
CREATE POLICY "advisor_invites_create" ON public.advisor_invites
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('advisor', 'admin')
    )
  );

-- Advisors can view invites they created
CREATE POLICY "advisor_invites_view_own" ON public.advisor_invites
  FOR SELECT USING (invited_by = auth.uid());

-- Anyone authenticated can read by code (to validate during acceptance)
CREATE POLICY "advisor_invites_read_by_code" ON public.advisor_invites
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function to accept advisor invite
CREATE OR REPLACE FUNCTION public.accept_advisor_invite(invite_code_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record record;
BEGIN
  SELECT * INTO invite_record
  FROM public.advisor_invites
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
  UPDATE public.advisor_invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = invite_record.id;

  -- Update user's role to advisor
  UPDATE public.profiles
  SET role = 'advisor'
  WHERE id = auth.uid();

  -- Create advisor_profile if not exists
  INSERT INTO public.advisor_profiles (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN invite_record.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_advisor_invite(text) TO authenticated;
```

#### Backend Changes
- Server action: `generateAdvisorInviteCode()` → returns 8-char alphanumeric code
- Uses same code generation pattern as student invites

#### Frontend Changes
- **New page**: `app/join/advisor/page.tsx`
  - Similar to `/join` but for advisors
  - Accepts 8-char code
  - Shows "Create Account" or "Sign In" options
  - Calls `accept_advisor_invite` RPC on success
  - Redirects to `/advisor` dashboard

- **New component**: `components/AdvisorInviteModal.tsx`
  - Used by advisors to generate invite codes
  - Shows code + copy button + optional mailto: link
  - Similar structure to `InviteCodeModal.tsx`

- **Modify**: `components/AdvisorDashboard.tsx`
  - Add "Invite Advisor" button in header area

- **Modify**: `app/login/page.tsx`
  - Add "I have an advisor invite code" link → `/join/advisor`

#### Acceptance Criteria
- [ ] Advisors can generate 8-char invite codes
- [ ] Codes are case-insensitive
- [ ] `/join/advisor` accepts codes and creates advisor account
- [ ] Role updated to 'advisor' and advisor_profile created
- [ ] Used codes cannot be reused
- [ ] Codes expire after 7 days
- [ ] Expired codes show appropriate error message

#### Manual Test Script
1. Login as existing advisor
2. Click "Invite Advisor" button
3. Copy the generated code
4. Log out
5. Go to `/join/advisor`
6. Enter code + create new account with email/password
7. Verify role is 'advisor' in database
8. Verify redirected to `/advisor` dashboard
9. Verify roster is visible (empty initially)
10. Test expired code (modify expires_at in DB, try to use)
11. Test already-used code

#### Notes/Risks
- First advisor must be created manually (seed data or admin panel)
- v2: Admin panel for managing advisor invites

---

### Slice S1-D: House Rules Content

**Goal**: Create the AI coach rules content displayed during onboarding consent.

#### DB + RLS Changes
- None (uses S1-A `user_consents` table)

#### Backend Changes
- None

#### Frontend Changes
- **New component**: `components/HouseRulesContent.tsx`
  - Markdown/JSX content explaining:
    - **AI is a coach, not a ghostwriter** - AI helps you learn, it doesn't do your work
    - **Students own their work** - All assignments and notes belong to the student
    - **Parents see signals, not surveillance** - Parents get alerts about overdue items and big tests, not full assignment details
    - **Advisors guide, they don't do the work** - Advisors provide direction and feedback

- **Modify**: `components/ProfileCompletionModal.tsx` (from S1-B)
  - Include HouseRulesContent in Step 2
  - Checkbox: "I understand and agree to these guidelines"
  - Store consent type: `ai_coach_rules`

#### Acceptance Criteria
- [ ] House rules displayed clearly in consent step
- [ ] Rules are readable and scannable (use headers, bullet points)
- [ ] Checkbox required to proceed
- [ ] Consent record saved with type `ai_coach_rules`
- [ ] Different consent types for different roles if needed

#### Manual Test Script
1. Start profile completion flow (new user)
2. Complete Step 1 (name + timezone)
3. Reach Step 2 - verify house rules are displayed
4. Try to submit without checking consent box - should fail
5. Check consent box and submit
6. Verify `user_consents` record with `consent_type = 'ai_coach_rules'`

#### Notes/Risks
- Content should be reviewed by product/legal for accuracy
- v2: Versioned consent for GDPR compliance (track which version user agreed to)

---

### Slice S1-E: End-to-End Verification & Polish

**Goal**: Verify all user stories work end-to-end; final polish.

#### DB + RLS Changes
- None

#### Backend Changes
- None

#### Frontend Changes
- Fix any bugs found during E2E testing
- Add loading states where missing
- Improve error messages

#### Acceptance Criteria
- [ ] **Student story**: Get invite code from parent → `/join` → complete profile → see dashboard with "this is my school hub" messaging
- [ ] **Parent story**: Self-register → complete profile with consent → add student → generate invite code → student joins
- [ ] **Advisor story**: Get invite code from existing advisor → `/join/advisor` → complete profile → see empty roster → get assigned students
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No console errors in browser
- [ ] All profile completion required before dashboard access

#### Manual Test Script
1. **Parent Flow**:
   - Go to `/login` → Create account as parent
   - Verify profile completion modal appears
   - Complete profile with consent
   - Add a student (Maya, Grade 7)
   - Generate invite code for Maya
   - Copy code

2. **Student Flow**:
   - Log out
   - Go to `/join`
   - Enter Maya's invite code
   - Create student account
   - Verify profile completion modal appears
   - Complete profile with consent
   - Verify dashboard shows "Welcome Maya" and linked to parent's data

3. **Advisor Flow**:
   - (Requires existing advisor - use seed data or manual DB insert)
   - Login as existing advisor
   - Generate advisor invite code
   - Log out
   - Go to `/join/advisor`
   - Create advisor account with code
   - Verify profile completion modal
   - Complete profile
   - Verify advisor dashboard with roster

4. **Verification Checks**:
   - All users have `onboarding_completed_at` set
   - All users have consent records
   - Run `npm run lint` and `npm run build`

#### Notes/Risks
- May discover edge cases during E2E testing
- First advisor bootstrap requires manual intervention or seed script

---

## C) Dependencies & Sequencing

```
S1-A (DB Infrastructure) ──┬──> S1-B (Gate UI) ──> S1-D (House Rules)
                           │                              │
                           │                              ▼
S1-C (Advisor Invites) ────┴─────────────────────> S1-E (E2E Verification)
```

**Required order**:
1. S1-A must complete first (DB foundation)
2. S1-B depends on S1-A (needs columns/tables)
3. S1-D depends on S1-B (extends the modal)
4. S1-C can run in parallel with S1-B
5. S1-E must be last (verifies everything)

**Recommended execution order**:
S1-A → S1-B → S1-C (parallel with S1-D) → S1-D → S1-E

---

## D) Files to Modify Summary

| Slice | New Files | Modified Files |
|-------|-----------|----------------|
| S1-A | `supabase/migrations/YYYYMMDDHHMMSS_profile_completion_consent.sql` | - |
| S1-B | `components/ProfileCompletionGate.tsx`, `components/ProfileCompletionModal.tsx`, `components/TimezoneSelect.tsx` | `app/(dash)/[role]/page.tsx` |
| S1-C | `app/join/advisor/page.tsx`, `components/AdvisorInviteModal.tsx`, `supabase/migrations/YYYYMMDDHHMMSS_advisor_invites.sql` | `components/AdvisorDashboard.tsx`, `app/login/page.tsx` |
| S1-D | `components/HouseRulesContent.tsx` | `components/ProfileCompletionModal.tsx` |
| S1-E | - | Various bug fixes |

---

## E) Verification Checklist (Per Slice)

Each slice must pass before merge:

- [ ] New migration created (never edit existing)
- [ ] `supabase db push` succeeds
- [ ] `supabase db pull` confirms sync
- [ ] `supabase migration list` shows aligned
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test script executed successfully
- [ ] Commit message follows format: `slice S1-X: <description>`
- [ ] No secrets committed
- [ ] Slice marked complete in tracker

---

## F) Risk Register

| Risk | Mitigation |
|------|------------|
| Existing users blocked by profile gate | Check `onboarding_completed_at` - if null but user existed before migration, auto-complete or prompt once |
| First advisor bootstrap | Require manual DB insert or seed script for first advisor |
| Timezone detection fails | Fallback to UTC, allow manual selection |
| Consent checkbox skipped | Form validation prevents submission without consent |
| Migration conflicts with Plan 1 | Run `supabase migration list` before starting each slice |

---

## G) What We Are NOT Doing

- **Invite-only signup for parents** - Would add friction with no benefit
- **Admin approval workflow for advisors** - Invite codes are sufficient control
- **Complex multi-step onboarding wizard** - Keep it to 2 steps max
- **Email verification** - Rely on Supabase Auth defaults
- **Parent invite system** - Can be added later if co-parent scenarios needed
- **Subjects field on profiles** - Already handled via course enrollments

---

## H) Slice Status Tracker

Legend: ⬜ not started | 🟨 in progress | ✅ complete | ⛔ blocked

| Slice | Name | Status | PR/Commit | Completed (date) | Notes |
|---:|---|---|---|---|---|
| S1-A | Profile Completion Infrastructure | ⬜ | - | - | DB fields: timezone, onboarding_completed_at, user_consents table |
| S1-B | Profile Completion Gate UI | ⬜ | - | - | ProfileCompletionGate, ProfileCompletionModal, TimezoneSelect |
| S1-C | Advisor Invite System | ⬜ | - | - | advisor_invites table, /join/advisor, AdvisorInviteModal |
| S1-D | House Rules Content | ⬜ | - | - | HouseRulesContent component, consent step content |
| S1-E | E2E Verification & Polish | ⬜ | - | - | Full user story testing, lint/build verification |

---

## I) User Stories Verification

After all slices complete, verify these user stories:

### Student Story
> "As a student, I want to join with a code and see my dashboard immediately so I know 'this is my school hub.'"

- [ ] Student receives invite code from parent
- [ ] Student goes to `/join` and enters code
- [ ] Student creates account or links existing account
- [ ] Profile completion modal appears (name, timezone, consent)
- [ ] After completion, student sees dashboard with their data
- [ ] Dashboard feels like "my school hub" (personalized greeting, my assignments, my schedule)

### Parent Story
> "As a parent, I want to link to my child and give consent so I can confidently let them use the app."

- [ ] Parent self-registers at `/login`
- [ ] Profile completion modal captures consent to house rules
- [ ] Parent understands AI is a coach, not ghostwriter
- [ ] Parent adds student and generates invite code
- [ ] Parent shares code with student (manually)
- [ ] Parent sees student linked after student joins
- [ ] Parent has confidence child is in safe learning environment

### Advisor Story
> "As an advisor, I want to see my roster so I know who I'm responsible for."

- [ ] Advisor receives invite code from existing advisor
- [ ] Advisor goes to `/join/advisor` and uses code
- [ ] Profile completion modal captures advisor info
- [ ] Advisor sees their roster (students assigned to them)
- [ ] Roster shows student names, grades, and quick stats
- [ ] Advisor knows who they're responsible for

---

## J) Agent Correction Checklist

Use this checklist when reviewing agent work or making corrections:

### Before Each Slice
- [ ] Confirmed current branch is `lesson-53` or appropriate feature branch
- [ ] `git status` shows clean working tree (or only expected changes)
- [ ] Read the slice requirements completely before starting

### During Implementation
- [ ] Only creating NEW migration files (not editing existing ones)
- [ ] Migration file follows naming: `YYYYMMDDHHMMSS_<descriptive_name>.sql`
- [ ] RLS enabled on new tables with deny-by-default
- [ ] New components follow existing patterns in codebase
- [ ] No hardcoded values that should be configurable

### After Each Slice
- [ ] `supabase db push` succeeded
- [ ] `supabase db pull` shows "No schema changes found" (or expected changes)
- [ ] `supabase migration list` shows local and remote aligned
- [ ] `npm run lint` passes (fix any errors before commit)
- [ ] `npm run build` succeeds (fix any errors before commit)
- [ ] Manual test script executed and passed
- [ ] `git diff` reviewed - only expected files changed
- [ ] No secrets in diff (check for API keys, passwords, .env values)
- [ ] Commit message follows format: `slice S1-X: <description>`
- [ ] Commit includes `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
- [ ] Slice status updated to ✅ in tracker with commit SHA and date

### Common Corrections
| Issue | Correction |
|-------|------------|
| Forgot to enable RLS | Create fix-forward migration: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` |
| Wrong column type | Create fix-forward migration with `ALTER COLUMN` or add new column |
| Missing index | Create fix-forward migration: `CREATE INDEX IF NOT EXISTS...` |
| RLS policy too permissive | Create fix-forward migration: `DROP POLICY` + `CREATE POLICY` with correct rules |
| Component not rendering | Check imports, check that parent component uses it, check console for errors |
| Modal not closing | Check state management, ensure `onClose` callback is wired correctly |
| Form not submitting | Check validation, check network tab, check server action errors |
| Timezone not detecting | Ensure `Intl.DateTimeFormat().resolvedOptions().timeZone` is called client-side only |

### Recovery Commands
```bash
# If migration failed mid-way
supabase db push  # Retry

# If local/remote migrations out of sync
supabase migration list  # Check status
supabase db pull  # Pull remote changes

# If build fails
npm run build 2>&1 | head -50  # See first 50 lines of errors

# If lint fails
npm run lint -- --fix  # Auto-fix what's possible

# If need to see what changed
git diff --stat  # Summary of changes
git diff <file>  # Specific file changes
```

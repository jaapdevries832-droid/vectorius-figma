-- Slice 2: Mentor Notifications (Complete)
-- Creates mentor_notifications table to replace localStorage notifications
-- in MentorSkills.tsx and StudentSkills.tsx

-- ============================================================================
-- mentor_notifications table
-- ============================================================================
create table if not exists public.mentor_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  skill_assignment_id uuid references public.skill_assignments(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists mentor_notifications_mentor_id_idx
  on public.mentor_notifications (mentor_id, created_at desc);

create index if not exists mentor_notifications_student_id_idx
  on public.mentor_notifications (student_id);

alter table public.mentor_notifications enable row level security;

-- Mentors can read their own notifications
drop policy if exists "mentor_notifications_mentor_select" on public.mentor_notifications;
create policy "mentor_notifications_mentor_select"
  on public.mentor_notifications
  for select
  using (mentor_id = auth.uid());

-- Students can insert notifications for their mentor
-- (when they complete a skill assignment)
drop policy if exists "mentor_notifications_student_insert" on public.mentor_notifications;
create policy "mentor_notifications_student_insert"
  on public.mentor_notifications
  for insert
  with check (
    -- The student_id must match a student record where parent_id = current user
    -- (students sign in with their parent's account)
    exists (
      select 1 from public.students s
      where s.id = mentor_notifications.student_id
        and s.parent_id = auth.uid()
        and s.advisor_id = mentor_notifications.mentor_id
    )
  );

-- Mentors can update read_at for their own notifications
drop policy if exists "mentor_notifications_mentor_update" on public.mentor_notifications;
create policy "mentor_notifications_mentor_update"
  on public.mentor_notifications
  for update
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

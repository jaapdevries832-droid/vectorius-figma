-- Slice 6: Parent Data (READ-ONLY)
-- Creates advisor_notes table and parent_student_overview view
-- to replace demo data in ParentDashboard.tsx

-- ============================================================================
-- 1. advisor_notes table
-- ============================================================================
create table if not exists public.advisor_notes (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  message text not null,
  priority text not null default 'low' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

create index if not exists advisor_notes_student_id_idx
  on public.advisor_notes (student_id, created_at desc);

create index if not exists advisor_notes_advisor_id_idx
  on public.advisor_notes (advisor_id);

alter table public.advisor_notes enable row level security;

-- Parents can read advisor notes for their students
drop policy if exists "advisor_notes_parent_select" on public.advisor_notes;
create policy "advisor_notes_parent_select"
  on public.advisor_notes
  for select
  using (
    exists (
      select 1
      from public.students s
      where s.id = advisor_notes.student_id
        and s.parent_id = auth.uid()
    )
  );

-- Advisors can read notes they authored
drop policy if exists "advisor_notes_advisor_select" on public.advisor_notes;
create policy "advisor_notes_advisor_select"
  on public.advisor_notes
  for select
  using (advisor_id = auth.uid());

-- Advisors can insert notes for their students
drop policy if exists "advisor_notes_advisor_insert" on public.advisor_notes;
create policy "advisor_notes_advisor_insert"
  on public.advisor_notes
  for insert
  with check (
    advisor_id = auth.uid()
    and exists (
      select 1
      from public.students s
      where s.id = advisor_notes.student_id
        and s.advisor_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. parent_student_overview view
-- ============================================================================
create or replace view public.parent_student_overview
with (security_invoker = true)
as
select
  s.parent_id,
  s.id as student_id,
  concat(s.first_name, ' ', coalesce(s.last_name, '')) as student_name,

  -- Assignment counts
  count(
    case
      when a.status in ('not_started', 'in_progress')
        and a.due_at > now()
      then 1
    end
  ) as upcoming_assignments_count,

  count(
    case when a.status = 'completed' then 1 end
  ) as completed_assignments_count,

  count(
    case
      when a.status in ('not_started', 'in_progress')
        and a.due_at <= now()
      then 1
    end
  ) as overdue_assignments_count,

  -- Next upcoming due date
  min(
    case
      when a.status in ('not_started', 'in_progress')
        and a.due_at > now()
      then a.due_at
    end
  ) as next_due_at,

  -- Last activity timestamp (either note created or assignment completed)
  greatest(
    max(n.created_at),
    max(a.completed_at)
  ) as last_activity_at

from public.students s
left join public.assignments a on a.student_id = s.id
left join public.student_notes n on n.student_id = s.id and n.archived_at is null
where s.parent_id is not null
group by s.parent_id, s.id, s.first_name, s.last_name;

-- RLS for parent_student_overview view
-- (security_invoker = true means it runs with caller's permissions,
--  so existing students RLS policies will apply)

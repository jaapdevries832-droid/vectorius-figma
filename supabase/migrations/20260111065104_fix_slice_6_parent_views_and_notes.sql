-- Fix-forward Slice 6: Parent Data objects (advisor_notes + parent_student_overview)

create table if not exists public.advisor_notes (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null,
  student_id uuid not null,
  message text not null,
  priority text default 'normal',
  created_at timestamptz not null default now()
);

alter table public.advisor_notes
  alter column priority set default 'normal';
alter table public.advisor_notes
  drop constraint if exists advisor_notes_priority_check;

alter table public.advisor_notes enable row level security;

drop policy if exists advisor_notes_parent_select on public.advisor_notes;
create policy advisor_notes_parent_select
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

drop policy if exists advisor_notes_advisor_select on public.advisor_notes;
create policy advisor_notes_advisor_select
  on public.advisor_notes
  for select
  using (advisor_id = auth.uid());

drop policy if exists advisor_notes_advisor_insert on public.advisor_notes;
create policy advisor_notes_advisor_insert
  on public.advisor_notes
  for insert
  with check (advisor_id = auth.uid());

create or replace view public.parent_student_overview
with (security_invoker = true)
as
select
  s.parent_id,
  s.id as student_id,
  concat_ws(' ', s.first_name, s.last_name) as student_name,
  coalesce(
    count(*) filter (
      where a.status != 'completed'
        and a.due_at >= now()
    ),
    0
  ) as upcoming_assignments_count,
  coalesce(
    count(*) filter (where a.status = 'completed'),
    0
  ) as completed_assignments_count,
  coalesce(
    count(*) filter (
      where a.status != 'completed'
        and a.due_at < now()
    ),
    0
  ) as overdue_assignments_count,
  min(a.due_at) filter (
    where a.status != 'completed'
      and a.due_at >= now()
  ) as next_due_at,
  greatest(
    max(a.updated_at),
    max(a.created_at)
  ) as last_activity_at
from public.students s
left join public.assignments a on a.student_id = s.id
where s.parent_id = auth.uid()
group by s.parent_id, s.id, s.first_name, s.last_name;

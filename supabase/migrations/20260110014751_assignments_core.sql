do $$
begin
  create type public.assignment_priority as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

alter type public.assignment_status add value if not exists 'not_started';
alter type public.assignment_status add value if not exists 'in_progress';
alter type public.assignment_status add value if not exists 'completed';

alter table public.assignments
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists priority public.assignment_priority not null default 'medium',
  add column if not exists score numeric,
  add column if not exists max_score numeric,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_at timestamptz;

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create index if not exists assignments_student_due_idx
  on public.assignments (student_id, due_at);

alter table public.assignments enable row level security;

drop policy if exists assignments_parent_all on public.assignments;
create policy assignments_parent_all
on public.assignments
for all
using (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.parent_id = auth.uid()
  )
);

drop policy if exists assignments_advisor_all on public.assignments;
create policy assignments_advisor_all
on public.assignments
for all
using (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.advisor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.advisor_id = auth.uid()
  )
);

drop policy if exists assignments_student_select on public.assignments;
create policy assignments_student_select
on public.assignments
for select
using (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists assignments_student_update on public.assignments;
create policy assignments_student_update
on public.assignments
for update
using (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.student_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.student_user_id = auth.uid()
  )
);

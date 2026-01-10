create table if not exists public.skill_assignments (
  id uuid primary key default gen_random_uuid(),
  skill_module_id text not null references public.skill_modules(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.skill_assignments enable row level security;

drop policy if exists "skill_assignments_insert_advisor" on public.skill_assignments;
create policy "skill_assignments_insert_advisor"
  on public.skill_assignments
  for insert
  with check (
    assigned_by = auth.uid()
    and exists (
      select 1
      from public.students s
      where s.id = skill_assignments.student_id
        and s.advisor_id = auth.uid()
    )
  );

drop policy if exists "skill_assignments_select_student_or_advisor" on public.skill_assignments;
create policy "skill_assignments_select_student_or_advisor"
  on public.skill_assignments
  for select
  using (
    assigned_by = auth.uid()
    or exists (
      select 1
      from public.students s
      where s.id = skill_assignments.student_id
        and s.student_user_id = auth.uid()
    )
  );

drop policy if exists "skill_assignments_update_student_complete" on public.skill_assignments;
create policy "skill_assignments_update_student_complete"
  on public.skill_assignments
  for update
  using (
    exists (
      select 1
      from public.students s
      where s.id = skill_assignments.student_id
        and s.student_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = skill_assignments.student_id
        and s.student_user_id = auth.uid()
    )
    and skill_assignments.skill_module_id is not distinct from (
      select sa.skill_module_id
      from public.skill_assignments sa
      where sa.id = skill_assignments.id
    )
    and skill_assignments.student_id is not distinct from (
      select sa.student_id
      from public.skill_assignments sa
      where sa.id = skill_assignments.id
    )
    and skill_assignments.assigned_by is not distinct from (
      select sa.assigned_by
      from public.skill_assignments sa
      where sa.id = skill_assignments.id
    )
    and skill_assignments.assigned_at is not distinct from (
      select sa.assigned_at
      from public.skill_assignments sa
      where sa.id = skill_assignments.id
    )
  );

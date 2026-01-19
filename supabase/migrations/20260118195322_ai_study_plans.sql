create table if not exists public.ai_study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  target_assignment_id uuid references public.assignments(id) on delete set null,
  target_title text not null,
  target_due_at timestamptz not null,
  proposed_milestones jsonb not null,
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'modified', 'declined')),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ai_study_plans enable row level security;

drop policy if exists "student_own_plans" on public.ai_study_plans;
create policy "student_own_plans"
  on public.ai_study_plans
  for all
  using (
    exists (
      select 1
      from public.students s
      where s.id = ai_study_plans.student_id
        and s.student_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = ai_study_plans.student_id
        and s.student_user_id = auth.uid()
    )
  );

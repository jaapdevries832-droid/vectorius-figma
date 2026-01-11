alter table public.assignments
  add column if not exists "type" text;

drop policy if exists assignments_student_insert on public.assignments;
create policy assignments_student_insert
on public.assignments
for insert
with check (
  exists (
    select 1
    from public.students s
    where s.id = assignments.student_id
      and s.student_user_id = auth.uid()
  )
);

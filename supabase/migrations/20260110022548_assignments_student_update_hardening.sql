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
  and assignments.score is not distinct from (
    select a.score
    from public.assignments a
    where a.id = assignments.id
  )
  and assignments.max_score is not distinct from (
    select a.max_score
    from public.assignments a
    where a.id = assignments.id
  )
);

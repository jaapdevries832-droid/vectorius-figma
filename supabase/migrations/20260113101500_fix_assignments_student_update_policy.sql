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

revoke update on table public.assignments from anon;
revoke update on table public.assignments from authenticated;

grant update (
  student_id,
  creator_advisor_id,
  title,
  description,
  due_at,
  status,
  course_id,
  priority,
  created_by,
  completed_at
) on table public.assignments to authenticated;

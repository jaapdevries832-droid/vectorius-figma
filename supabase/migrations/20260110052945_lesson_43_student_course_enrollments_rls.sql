-- Ensure RLS is enabled (no-op if already)
alter table public.student_course_enrollments enable row level security;

-- Students can enroll themselves
drop policy if exists student_course_enrollments_insert_own on public.student_course_enrollments;
create policy student_course_enrollments_insert_own
on public.student_course_enrollments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_course_enrollments.student_id
      and s.student_user_id = auth.uid()
  )
);

-- Students can unenroll themselves
drop policy if exists student_course_enrollments_delete_own on public.student_course_enrollments;
create policy student_course_enrollments_delete_own
on public.student_course_enrollments
for delete
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_course_enrollments.student_id
      and s.student_user_id = auth.uid()
  )
);

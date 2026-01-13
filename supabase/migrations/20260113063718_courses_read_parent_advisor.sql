-- Allow parents and advisors to read courses linked to their students' enrollments.
drop policy if exists courses_read_parent_advisor on public.courses;
create policy courses_read_parent_advisor
  on public.courses
  for select
  using (
    exists (
      select 1
      from public.student_course_enrollments e
      join public.students s on s.id = e.student_id
      where e.course_id = courses.id
        and (s.parent_id = auth.uid() or s.advisor_id = auth.uid())
    )
  );

-- Verify policy exists:
-- select policyname, schemaname, tablename, cmd
-- from pg_policies
-- where schemaname = 'public' and tablename = 'courses'
-- order by policyname;

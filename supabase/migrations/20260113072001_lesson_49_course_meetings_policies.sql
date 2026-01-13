-- Allow students to manage meetings for their own courses.
drop policy if exists course_meetings_insert_own on public.course_meetings;
create policy course_meetings_insert_own
on public.course_meetings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses c
    join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists course_meetings_update_own on public.course_meetings;
create policy course_meetings_update_own
on public.course_meetings
for update
to authenticated
using (
  exists (
    select 1
    from public.courses c
    join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and s.student_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses c
    join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists course_meetings_delete_own on public.course_meetings;
create policy course_meetings_delete_own
on public.course_meetings
for delete
to authenticated
using (
  exists (
    select 1
    from public.courses c
    join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and s.student_user_id = auth.uid()
  )
);

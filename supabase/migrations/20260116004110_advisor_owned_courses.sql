-- Allow advisors (and other non-student roles) to create their own courses
-- by adding created_by_user_id column to courses table.

-- Add column for user-created courses (e.g., advisors)
alter table public.courses
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null;

-- Update courses RLS policies to allow advisors to manage their own courses

-- READ: Allow users to read their own courses
drop policy if exists courses_read on public.courses;
create policy courses_read
on public.courses
for select
to authenticated
using (
  -- Public courses (no owner)
  (created_by_student_id is null and created_by_user_id is null)
  -- Student-owned courses (student can read their own)
  or exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
  -- User-owned courses (advisors etc can read their own)
  or created_by_user_id = auth.uid()
);

-- INSERT: Allow advisors to create courses
drop policy if exists courses_insert_own on public.courses;
create policy courses_insert_own
on public.courses
for insert
to authenticated
with check (
  -- Student creating their own course
  exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
  -- Non-student (advisor) creating their own course
  or (
    created_by_student_id is null
    and created_by_user_id = auth.uid()
  )
);

-- UPDATE: Allow owners to update their courses
drop policy if exists courses_update_own on public.courses;
create policy courses_update_own
on public.courses
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
  or created_by_user_id = auth.uid()
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
  or created_by_user_id = auth.uid()
);

-- DELETE: Allow owners to delete their courses
drop policy if exists courses_delete_own on public.courses;
create policy courses_delete_own
on public.courses
for delete
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
  or created_by_user_id = auth.uid()
);

-- Update course_meetings policies to allow advisors to manage meetings

drop policy if exists course_meetings_insert_own on public.course_meetings;
create policy course_meetings_insert_own
on public.course_meetings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses c
    left join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and (
        s.student_user_id = auth.uid()
        or c.created_by_user_id = auth.uid()
      )
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
    left join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and (
        s.student_user_id = auth.uid()
        or c.created_by_user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.courses c
    left join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and (
        s.student_user_id = auth.uid()
        or c.created_by_user_id = auth.uid()
      )
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
    left join public.students s on s.id = c.created_by_student_id
    where c.id = course_meetings.course_id
      and (
        s.student_user_id = auth.uid()
        or c.created_by_user_id = auth.uid()
      )
  )
);

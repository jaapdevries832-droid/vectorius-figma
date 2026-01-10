alter table public.courses
  add column if not exists created_by_student_id uuid references public.students(id) on delete set null;

alter table public.courses enable row level security;

drop policy if exists courses_read on public.courses;
create policy courses_read
on public.courses
for select
to authenticated
using (
  created_by_student_id is null
  or exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists courses_insert_own on public.courses;
create policy courses_insert_own
on public.courses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
);

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
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = courses.created_by_student_id
      and s.student_user_id = auth.uid()
  )
);

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
);

-- Lesson 33: Parent ↔ Students (CRUD + duplicate prevention + delete)
-- Forward-only adjustments to existing students schema:
-- - optional student_user_id link
-- - consistent updated_at trigger via public.set_updated_at()
-- - parent CRUD RLS policies + optional student read policy

-- Optional link to a student's own profile/login
alter table public.students
  add column if not exists student_user_id uuid null;

do $$
begin
  alter table public.students
    add constraint students_student_user_id_fkey
    foreign key (student_user_id)
    references public.profiles(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

-- Normalize last_name '' -> NULL so uniqueness is consistent
update public.students set last_name = null where last_name = '';

-- Unique per parent: (first_name,last_name,grade) case-insensitive
create unique index if not exists students_unique_per_parent
on public.students (
  parent_id,
  lower(first_name),
  lower(coalesce(last_name, '')),
  coalesce(grade, '')
);

-- Ensure updated_at is handled by public.set_updated_at()
drop trigger if exists trg_students_touch on public.students;

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

alter table public.students enable row level security;

-- Parent can CRUD their students
drop policy if exists "Students select own" on public.students;
drop policy if exists "Students insert own" on public.students;
drop policy if exists "Students update own" on public.students;
drop policy if exists "Students delete own" on public.students;

drop policy if exists "students_parent_select" on public.students;
create policy "students_parent_select"
on public.students for select
using (parent_id = auth.uid());

drop policy if exists "students_parent_insert" on public.students;
create policy "students_parent_insert"
on public.students for insert
with check (parent_id = auth.uid());

drop policy if exists "students_parent_update" on public.students;
create policy "students_parent_update"
on public.students for update
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

drop policy if exists "students_parent_delete" on public.students;
create policy "students_parent_delete"
on public.students for delete
using (parent_id = auth.uid());

-- Optional: student can read their own row if student_user_id set
drop policy if exists "students_student_select" on public.students;
create policy "students_student_select"
on public.students for select
using (student_user_id = auth.uid());

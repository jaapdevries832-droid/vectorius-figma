create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  title text not null,
  teacher_name text,
  location text
);

create table if not exists public.course_meetings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);

create table if not exists public.student_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

alter table public.subjects enable row level security;
alter table public.courses enable row level security;
alter table public.course_meetings enable row level security;
alter table public.student_course_enrollments enable row level security;

create policy "subjects_read" on public.subjects for select using (auth.uid() is not null);
create policy "courses_read" on public.courses for select using (auth.uid() is not null);
create policy "course_meetings_read" on public.course_meetings for select using (auth.uid() is not null);

create policy "enrollments_parent_read"
on public.student_course_enrollments for select
using (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and s.parent_id = auth.uid()
  )
);

create policy "enrollments_advisor_read"
on public.student_course_enrollments for select
using (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and s.advisor_id = auth.uid()
  )
);

create policy "enrollments_student_read"
on public.student_course_enrollments for select
using (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and s.student_user_id = auth.uid()
  )
);

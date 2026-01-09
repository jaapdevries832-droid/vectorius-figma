-- Lesson 34: Advisor model + student assignments

create table if not exists public.advisor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  specialties text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_advisor_profiles_updated_at on public.advisor_profiles;
create trigger set_advisor_profiles_updated_at
before update on public.advisor_profiles
for each row execute function public.set_updated_at();

alter table public.advisor_profiles enable row level security;

-- Advisors can read/update their own advisor_profile
drop policy if exists "advisor_profiles_self" on public.advisor_profiles;
create policy "advisor_profiles_self"
on public.advisor_profiles for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Add advisor_id to students
alter table public.students
  add column if not exists advisor_id uuid null references public.profiles(id) on delete set null;

-- RLS: advisor can read students assigned to them
drop policy if exists "students_advisor_select" on public.students;
create policy "students_advisor_select"
on public.students for select
using (advisor_id = auth.uid());

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null,
  last_name text,
  grade text
);

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();
alter table public.profiles
  add column if not exists display_name text;

alter table public.students
  add column if not exists parent_id uuid references public.profiles(id) on delete cascade;
alter table public.students
  add column if not exists created_at timestamptz not null default now();
alter table public.students
  add column if not exists updated_at timestamptz not null default now();
alter table public.students
  add column if not exists first_name text;
alter table public.students
  add column if not exists last_name text;
alter table public.students
  add column if not exists grade text;

delete from public.students where parent_id is null;
delete from public.students where first_name is null;

alter table public.students
  alter column parent_id set not null;
alter table public.students
  alter column first_name set not null;

alter table public.profiles enable row level security;
alter table public.students enable row level security;

drop policy if exists "Profiles select own" on public.profiles;
create policy "Profiles select own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Profiles insert own" on public.profiles;
create policy "Profiles insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Students select own" on public.students;
create policy "Students select own"
  on public.students
  for select
  using (auth.uid() = parent_id);

drop policy if exists "Students insert own" on public.students;
create policy "Students insert own"
  on public.students
  for insert
  with check (auth.uid() = parent_id);

drop policy if exists "Students update own" on public.students;
create policy "Students update own"
  on public.students
  for update
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

drop policy if exists "Students delete own" on public.students;
create policy "Students delete own"
  on public.students
  for delete
  using (auth.uid() = parent_id);

create table if not exists public.google_classroom_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  classroom_id text not null,
  course_name text,
  last_sync_at timestamptz,
  access_token_encrypted text,
  created_at timestamptz not null default now(),
  unique (student_id, classroom_id)
);

create table if not exists public.email_inbox_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  email_provider text not null check (email_provider in ('gmail', 'outlook')),
  email_address text not null,
  access_token_encrypted text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique (parent_id, email_address)
);

alter table public.assignments
  add column if not exists external_id text;

alter table public.calendar_events
  add column if not exists external_id text;

create index if not exists idx_assignments_external
  on public.assignments(external_id)
  where external_id is not null;

create index if not exists idx_calendar_events_external
  on public.calendar_events(external_id)
  where external_id is not null;

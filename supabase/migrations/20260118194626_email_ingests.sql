create table if not exists public.email_ingests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  raw_text text not null,
  parsed_events jsonb,
  status text not null default 'pending' check (status in ('pending', 'parsed', 'imported', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.email_ingests enable row level security;

drop policy if exists "parent_own_ingests" on public.email_ingests;
create policy "parent_own_ingests"
  on public.email_ingests
  for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alert_type') then
    create type public.alert_type as enum (
      'overdue_assignment',
      'upcoming_test',
      'upcoming_project',
      'school_event',
      'suggestion_declined'
    );
  end if;
end $$;

create table if not exists public.parent_alerts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  alert_type public.alert_type not null,
  title text not null,
  message text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_parent_alerts_unread
  on public.parent_alerts(parent_id, is_read, created_at desc);

alter table public.parent_alerts enable row level security;

drop policy if exists "parent_own_alerts" on public.parent_alerts;
create policy "parent_own_alerts"
  on public.parent_alerts
  for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

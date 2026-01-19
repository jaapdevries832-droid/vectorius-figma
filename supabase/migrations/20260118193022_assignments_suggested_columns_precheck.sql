alter table public.assignments
  add column if not exists is_suggested boolean not null default false,
  add column if not exists suggestion_status text;

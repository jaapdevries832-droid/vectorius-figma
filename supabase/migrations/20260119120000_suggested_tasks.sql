-- Add suggestion workflow columns to assignments
alter table public.assignments
  add column if not exists is_suggested boolean not null default false,
  add column if not exists suggestion_status text,
  add column if not exists suggestion_responded_at timestamptz;

alter table public.assignments
  drop constraint if exists assignments_suggestion_status_check;

alter table public.assignments
  add constraint assignments_suggestion_status_check
  check (suggestion_status is null or suggestion_status in ('pending', 'accepted', 'declined'));

-- Allow students to record suggestion responses
grant update (suggestion_status, suggestion_responded_at)
  on table public.assignments
  to authenticated;

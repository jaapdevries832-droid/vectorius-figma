do $$
begin
  create type public.task_source as enum (
    'student',
    'parent',
    'advisor',
    'ai',
    'google_classroom',
    'manual_import'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.assignments
  add column if not exists source public.task_source not null default 'student',
  add column if not exists created_by_role public.app_role;

update public.assignments
set created_by_role = (
  select role::public.app_role from public.profiles where id = assignments.created_by
)
where created_by is not null
  and created_by_role is null;

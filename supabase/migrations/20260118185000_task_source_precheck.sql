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

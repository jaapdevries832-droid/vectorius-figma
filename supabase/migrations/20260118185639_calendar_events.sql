do $$
begin
  if not exists (select 1 from pg_type where typname = 'calendar_event_type') then
    create type public.calendar_event_type as enum (
      'appointment',
      'school_event',
      'travel',
      'extracurricular',
      'study_block',
      'other'
    );
  end if;
end $$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  description text,
  event_type public.calendar_event_type not null default 'other',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  is_private boolean not null default false,
  source public.task_source not null default 'student',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_student_date
  on public.calendar_events(student_id, start_at);

alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_student_select on public.calendar_events;
create policy calendar_events_student_select
on public.calendar_events
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists calendar_events_student_insert on public.calendar_events;
create policy calendar_events_student_insert
on public.calendar_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists calendar_events_student_update on public.calendar_events;
create policy calendar_events_student_update
on public.calendar_events
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.student_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists calendar_events_student_delete on public.calendar_events;
create policy calendar_events_student_delete
on public.calendar_events
for delete
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.student_user_id = auth.uid()
  )
);

drop policy if exists calendar_events_parent_select on public.calendar_events;
create policy calendar_events_parent_select
on public.calendar_events
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.parent_id = auth.uid()
  )
  and (calendar_events.is_private = false or calendar_events.source = 'parent')
);

drop policy if exists calendar_events_parent_insert on public.calendar_events;
create policy calendar_events_parent_insert
on public.calendar_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.parent_id = auth.uid()
  )
  and calendar_events.source = 'parent'
  and calendar_events.is_private = false
);

drop policy if exists calendar_events_parent_update on public.calendar_events;
create policy calendar_events_parent_update
on public.calendar_events
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.parent_id = auth.uid()
  )
  and calendar_events.created_by = auth.uid()
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.parent_id = auth.uid()
  )
  and calendar_events.created_by = auth.uid()
  and calendar_events.source = 'parent'
  and calendar_events.is_private = false
);

drop policy if exists calendar_events_parent_delete on public.calendar_events;
create policy calendar_events_parent_delete
on public.calendar_events
for delete
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = calendar_events.student_id
      and s.parent_id = auth.uid()
  )
  and calendar_events.created_by = auth.uid()
);

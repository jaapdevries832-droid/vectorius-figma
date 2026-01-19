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
  and calendar_events.source in ('parent', 'manual_import')
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
  and calendar_events.source in ('parent', 'manual_import')
  and calendar_events.is_private = false
);

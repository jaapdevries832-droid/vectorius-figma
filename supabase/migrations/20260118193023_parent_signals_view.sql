create or replace view public.parent_student_signals
with (security_invoker = true)
as
select
  s.id as student_id,
  s.parent_id,
  s.first_name || ' ' || coalesce(s.last_name, '') as student_name,
  (select count(*)
   from public.assignments a
   where a.student_id = s.id
     and a.due_at < now()
     and a.status not in ('completed', 'archived')) as overdue_count,
  (select json_build_object('title', a.title, 'due_at', a.due_at, 'type', a.type)
   from public.assignments a
   where a.student_id = s.id
     and a.type in ('test', 'project')
     and a.due_at between now() and now() + interval '14 days'
     and a.status not in ('completed', 'archived')
   order by a.due_at
   limit 1) as next_big_item,
  (select count(*) > 0
   from public.assignments a
   where a.student_id = s.id
     and a.status not in ('completed', 'archived')) as has_active_plan,
  (select count(*)
   from public.assignments a
   where a.student_id = s.id
     and a.is_suggested = true
     and a.suggestion_status = 'pending') as pending_suggestions
from public.students s;

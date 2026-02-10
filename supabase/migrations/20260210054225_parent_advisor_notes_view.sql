create or replace view public.advisor_notes_with_profiles
with (security_invoker = true)
as
select
  an.id,
  an.advisor_id,
  an.student_id,
  an.message,
  an.priority,
  an.created_at,
  p.first_name as advisor_first_name,
  p.last_name as advisor_last_name,
  p.email as advisor_email
from public.advisor_notes an
left join public.profiles p on p.id = an.advisor_id;

grant select on public.advisor_notes_with_profiles to authenticated;

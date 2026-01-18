-- Slice 1 fix: accept invite in a single, secure transaction.
create or replace function public.accept_student_invite(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record record;
begin
  select *
  into invite_record
  from public.student_invites
  where upper(invite_code) = upper(invite_code_input)
  for update;

  if invite_record is null then
    raise exception 'Invite not found';
  end if;

  if invite_record.accepted_at is not null then
    raise exception 'Invite already used';
  end if;

  if invite_record.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  update public.student_invites
  set accepted_at = now()
  where id = invite_record.id;

  update public.students
  set student_user_id = auth.uid()
  where id = invite_record.student_id
    and student_user_id is null;

  if not found then
    raise exception 'Student already linked';
  end if;

  return invite_record.student_id;
end;
$$;

grant execute on function public.accept_student_invite(text) to authenticated;

drop policy if exists "students_accept_invite" on public.students;

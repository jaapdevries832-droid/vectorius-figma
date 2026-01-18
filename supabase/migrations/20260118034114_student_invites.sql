-- Slice 1: student invite codes
create table if not exists public.student_invites (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  invite_code text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_invites_code on public.student_invites(invite_code);
create index if not exists idx_student_invites_student on public.student_invites(student_id);

alter table public.student_invites enable row level security;

drop policy if exists "student_invites_parent_manage" on public.student_invites;
create policy "student_invites_parent_manage"
on public.student_invites
for all
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

drop policy if exists "student_invites_select_by_code" on public.student_invites;
create policy "student_invites_select_by_code"
on public.student_invites
for select
using (auth.uid() is not null);

drop policy if exists "student_invites_accept" on public.student_invites;
create policy "student_invites_accept"
on public.student_invites
for update
using (auth.uid() is not null and accepted_at is null)
with check (auth.uid() is not null);

-- Allow students to claim an invite by linking their profile to the student record.
drop policy if exists "students_accept_invite" on public.students;
create policy "students_accept_invite"
on public.students
for update
using (student_user_id is null and auth.uid() is not null)
with check (student_user_id = auth.uid());

alter table public.student_notes
  add column if not exists is_private boolean not null default true;

drop policy if exists "parent_view_notes" on public.student_notes;
drop policy if exists "student_notes_student_select" on public.student_notes;
drop policy if exists "student_notes_student_insert" on public.student_notes;
drop policy if exists "student_notes_student_update" on public.student_notes;
drop policy if exists "student_notes_student_delete" on public.student_notes;

create policy "student_notes_full"
  on public.student_notes
  for all
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_notes.student_id
        and s.student_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_notes.student_id
        and s.student_user_id = auth.uid()
    )
  );

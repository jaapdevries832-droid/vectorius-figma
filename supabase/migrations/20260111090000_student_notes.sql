create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  body text not null,
  color text not null default 'sticky-note',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists student_notes_student_id_idx
  on public.student_notes (student_id);

alter table public.student_notes enable row level security;

drop policy if exists "student_notes_student_select" on public.student_notes;
create policy "student_notes_student_select"
  on public.student_notes
  for select
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_notes.student_id
        and s.student_user_id = auth.uid()
    )
  );

drop policy if exists "student_notes_student_insert" on public.student_notes;
create policy "student_notes_student_insert"
  on public.student_notes
  for insert
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_notes.student_id
        and s.student_user_id = auth.uid()
    )
  );

drop policy if exists "student_notes_student_update" on public.student_notes;
create policy "student_notes_student_update"
  on public.student_notes
  for update
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

drop policy if exists "student_notes_student_delete" on public.student_notes;
create policy "student_notes_student_delete"
  on public.student_notes
  for delete
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_notes.student_id
        and s.student_user_id = auth.uid()
    )
  );

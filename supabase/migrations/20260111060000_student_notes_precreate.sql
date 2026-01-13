-- Fix-forward: parent_data view references public.student_notes, but the original
-- student_notes migration runs later. Pre-create the table + index so db reset succeeds.
-- This migration is intentionally idempotent.

create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  body text not null,
  color text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists student_notes_student_id_idx
  on public.student_notes (student_id);

alter table public.student_notes enable row level security;

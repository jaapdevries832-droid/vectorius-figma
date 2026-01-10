-- Lesson 43: allow manual course creation without subjects (MVP)
alter table public.courses
alter column subject_id drop not null;

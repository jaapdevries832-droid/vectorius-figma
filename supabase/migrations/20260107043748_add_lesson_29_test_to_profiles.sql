alter table public.profiles
  add column if not exists lesson_29_test text;

create index if not exists profiles_lesson_29_test_idx
  on public.profiles (lesson_29_test);

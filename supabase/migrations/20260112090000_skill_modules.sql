create table if not exists public.skill_modules (
  id text primary key,
  title text not null,
  description text not null,
  objectives text[],
  media jsonb,
  duration text,
  difficulty text,
  topic text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.skill_modules enable row level security;

drop policy if exists "skill_modules_authenticated_select" on public.skill_modules;
create policy "skill_modules_authenticated_select"
  on public.skill_modules
  for select
  using (auth.role() = 'authenticated');

insert into public.skill_modules (id, title, description, objectives, media, duration, difficulty, topic)
values
  (
    'skill-1',
    'Taking Notes from Textbooks',
    'Learn structured note-taking strategies (Cornell, outline, mapping) to capture key concepts from readings.',
    array[
      'Identify main ideas and supporting details',
      'Use Cornell method to summarize sections',
      'Create quick review questions from headings'
    ],
    '[{"type":"video","url":"https://www.youtube.com/watch?v=AfQx2Xv9mJQ","title":"Cornell Notes in 5 minutes"},{"type":"article","url":"https://www.opencolleges.edu.au/informed/study-tips/note-taking-methods","title":"Note-taking methods overview"}]'::jsonb,
    '15-25 min',
    'beginner',
    'note-taking'
  ),
  (
    'skill-2',
    'Test Preparation Planner',
    'Build a backwards study plan with spaced practice and active recall before tests.',
    array[
      'Break topics into daily goals',
      'Apply spaced repetition across the week',
      'Use active recall and mini-quizzes'
    ],
    '[{"type":"exercise","url":"https://forms.gle/example-quiz","title":"Self-check quiz"},{"type":"article","url":"https://www.citl.mun.ca/learningstrategies/spacedpractice.php","title":"Spaced practice"}]'::jsonb,
    '20-30 min',
    'intermediate',
    'test-prep'
  ),
  (
    'skill-3',
    'Time Management: Pomodoro Basics',
    'Use focused 25-minute sessions with short breaks to stay on task and reduce procrastination.',
    array[
      'Set a clear sprint goal',
      'Minimize distractions for 25 minutes',
      'Reflect and adjust after each cycle'
    ],
    '[{"type":"video","url":"https://www.youtube.com/watch?v=mNBmG24djoY","title":"Pomodoro Technique explained"}]'::jsonb,
    '10-20 min',
    'beginner',
    'time-management'
  )
on conflict (id) do nothing;

-- Slice 8: Achievements (badges, rewards, points tracking)

-- Points ledger: track all point-earning events
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_type text not null, -- e.g. 'assignment_complete', 'skill_complete', 'streak_bonus', 'manual'
  source_id uuid, -- nullable: references source entity (assignment_id, skill_assignment_id, etc.)
  points integer not null check (points <> 0), -- can be positive or negative
  description text, -- optional human-readable description
  created_at timestamptz not null default now()
);

create index idx_points_ledger_student on public.points_ledger(student_id);
create index idx_points_ledger_created on public.points_ledger(created_at desc);

-- Enable RLS
alter table public.points_ledger enable row level security;

-- Students can read their own points
create policy "students_own_points" on public.points_ledger
  for select using (
    student_id in (
      select id from public.students
      where student_user_id = auth.uid()
    )
  );

-- System/advisors can insert points (controlled server-side)
-- For now, allow students to insert for testing (will lock down later)
create policy "students_can_insert_points" on public.points_ledger
  for insert with check (
    student_id in (
      select id from public.students
      where student_user_id = auth.uid()
    )
  );

-- Advisors can read their assigned students' points
create policy "advisors_read_student_points" on public.points_ledger
  for select using (
    student_id in (
      select id from public.students
      where advisor_id = auth.uid()
    )
  );

-- Badges: define available badges
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  criteria text not null, -- human-readable criteria
  icon text, -- icon name (e.g., 'star', 'award', 'flame')
  created_at timestamptz not null default now()
);

-- Enable RLS (public read for all authenticated users)
alter table public.badges enable row level security;

create policy "badges_public_read" on public.badges
  for select using (auth.role() = 'authenticated');

-- Student badges: awarded badges
create table public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique(student_id, badge_id) -- student can only earn each badge once
);

create index idx_student_badges_student on public.student_badges(student_id);
create index idx_student_badges_awarded on public.student_badges(awarded_at desc);

-- Enable RLS
alter table public.student_badges enable row level security;

-- Students can read their own badges
create policy "students_own_badges" on public.student_badges
  for select using (
    student_id in (
      select id from public.students
      where student_user_id = auth.uid()
    )
  );

-- Advisors can read their assigned students' badges
create policy "advisors_read_student_badges" on public.student_badges
  for select using (
    student_id in (
      select id from public.students
      where advisor_id = auth.uid()
    )
  );

-- Rewards: define available rewards
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  cost_points integer not null check (cost_points > 0),
  created_at timestamptz not null default now(),
  archived_at timestamptz -- soft delete for discontinued rewards
);

-- Enable RLS (public read for active rewards)
alter table public.rewards enable row level security;

create policy "rewards_public_read" on public.rewards
  for select using (
    auth.role() = 'authenticated' and archived_at is null
  );

-- Reward redemptions: track redeemed rewards
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled'))
);

create index idx_reward_redemptions_student on public.reward_redemptions(student_id);
create index idx_reward_redemptions_redeemed on public.reward_redemptions(redeemed_at desc);

-- Enable RLS
alter table public.reward_redemptions enable row level security;

-- Students can read their own redemptions
create policy "students_own_redemptions" on public.reward_redemptions
  for select using (
    student_id in (
      select id from public.students
      where student_user_id = auth.uid()
    )
  );

-- Students can insert redemptions (redeem rewards)
create policy "students_can_redeem" on public.reward_redemptions
  for insert with check (
    student_id in (
      select id from public.students
      where student_user_id = auth.uid()
    )
  );

-- Advisors can read their assigned students' redemptions
create policy "advisors_read_student_redemptions" on public.reward_redemptions
  for select using (
    student_id in (
      select id from public.students
      where advisor_id = auth.uid()
    )
  );

-- Seed data: initial badges
insert into public.badges (name, description, criteria, icon) values
  ('Starter', 'Complete your first task', 'Complete your first task', 'star'),
  ('On-Time Hero', '5 on-time submissions', '5 on-time submissions', 'award'),
  ('Curiosity', 'Ask 10 AI Tutor questions', 'Ask 10 AI Tutor questions', 'gift'),
  ('Streak Master', '7-day daily streak', '7-day daily streak', 'flame');

-- Seed data: initial rewards
insert into public.rewards (name, description, cost_points) values
  ('Study Resource Pack', 'Downloadable guides and cheatsheets', 200),
  ('Vectorius Trophy', 'Digital trophy for your profile', 500),
  ('Charity Donation', 'Donate points to support education', 600);

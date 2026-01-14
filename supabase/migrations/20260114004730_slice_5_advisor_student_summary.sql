-- Slice 5: Advisor Data
-- Creates advisor_student_summary view to replace hardcoded
-- subject/performance data in AdvisorDashboard.tsx

-- ============================================================================
-- advisor_student_summary view
-- ============================================================================
-- Replaces hardcoded subject, performance, assignments counts, and pending tasks
-- in AdvisorDashboard.tsx lines 47-48, 110-111, 131-132

create or replace view public.advisor_student_summary
with (security_invoker = true)
as
select
  s.advisor_id,
  s.id as student_id,
  concat(s.first_name, ' ', coalesce(s.last_name, '')) as student_name,
  s.grade,

  -- Placeholder subject_focus (future: could join to enrollment or courses)
  'General Studies' as subject_focus,

  -- Performance: calculated from assignment grades
  -- Uses same logic as AdvisorDashboard.tsx lines 86-104
  case
    when count(a.id) filter (where a.max_score is not null) = 0
    then null
    else round(
      (
        sum(coalesce(a.score, 0)) filter (where a.max_score is not null) * 100.0
      ) / nullif(sum(a.max_score) filter (where a.max_score is not null), 0)
    )
  end as performance,

  -- Last activity: most recent assignment or note timestamp
  greatest(
    max(a.created_at),
    max(a.completed_at),
    max(n.created_at)
  ) as last_activity_at,

  -- Open assignments count (not completed)
  count(a.id) filter (
    where a.status in ('not_started', 'in_progress')
  ) as assignments_open,

  -- Pending tasks: overdue assignments
  count(a.id) filter (
    where a.status in ('not_started', 'in_progress')
      and a.due_at < now()
  ) as pending_tasks,

  -- Grade metric: same calculation as performance but as decimal
  case
    when sum(a.max_score) filter (where a.max_score is not null) = 0
    then null
    else (
      sum(coalesce(a.score, 0)) filter (where a.max_score is not null) * 1.0
    ) / nullif(sum(a.max_score) filter (where a.max_score is not null), 0)
  end as grade_metric

from public.students s
left join public.assignments a on a.student_id = s.id
left join public.student_notes n on n.student_id = s.id and n.archived_at is null
where s.advisor_id is not null
group by s.advisor_id, s.id, s.first_name, s.last_name, s.grade;

-- RLS for advisor_student_summary view
-- (security_invoker = true means it runs with caller's permissions,
--  so existing students RLS policies will apply automatically)

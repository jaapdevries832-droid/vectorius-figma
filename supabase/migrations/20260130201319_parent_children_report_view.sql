-- Migration: Create parent_children_report view
-- Purpose: Provide aggregated assignment and grade data for parent reports page

CREATE OR REPLACE VIEW public.parent_children_report
WITH (security_invoker = true)
AS
SELECT
  s.id as student_id,
  s.parent_id,
  concat(s.first_name, ' ', coalesce(s.last_name, '')) as student_name,
  s.grade,

  -- Assignment statistics
  count(a.id) filter (where a.status not in ('completed', 'done', 'archived')) as active_assignments,
  count(a.id) filter (where a.status in ('completed', 'done')) as completed_assignments,
  count(a.id) filter (where a.status not in ('completed', 'done', 'archived') and a.due_at < now()) as overdue_assignments,

  -- Grade statistics (percentage)
  round(avg(case when a.max_score > 0 then (a.score::numeric / a.max_score) * 100 end)::numeric, 1) as avg_grade_percent,

  -- Recent activity
  max(a.completed_at) as last_completion,
  max(a.created_at) as last_assignment_added

FROM students s
LEFT JOIN assignments a ON a.student_id = s.id
GROUP BY s.id, s.parent_id, s.first_name, s.last_name, s.grade;

-- Grant access to authenticated users (RLS via security_invoker)
GRANT SELECT ON public.parent_children_report TO authenticated;

COMMENT ON VIEW public.parent_children_report IS 'Aggregated assignment and grade data for parent reports';

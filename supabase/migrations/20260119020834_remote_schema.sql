drop view if exists "public"."advisor_student_summary";

drop view if exists "public"."parent_student_overview";

drop view if exists "public"."parent_student_signals";

create or replace view "public"."advisor_student_summary" as  SELECT s.advisor_id,
    s.id AS student_id,
    concat(s.first_name, ' ', COALESCE(s.last_name, ''::text)) AS student_name,
    s.grade,
    'General Studies'::text AS subject_focus,
        CASE
            WHEN (count(a.id) FILTER (WHERE (a.max_score IS NOT NULL)) = 0) THEN NULL::numeric
            ELSE round(((sum(COALESCE(a.score, (0)::numeric)) FILTER (WHERE (a.max_score IS NOT NULL)) * 100.0) / NULLIF(sum(a.max_score) FILTER (WHERE (a.max_score IS NOT NULL)), (0)::numeric)))
        END AS performance,
    GREATEST(max(a.created_at), max(a.completed_at), max(n.created_at)) AS last_activity_at,
    count(a.id) FILTER (WHERE (a.status = ANY (ARRAY['not_started'::public.assignment_status, 'in_progress'::public.assignment_status]))) AS assignments_open,
    count(a.id) FILTER (WHERE ((a.status = ANY (ARRAY['not_started'::public.assignment_status, 'in_progress'::public.assignment_status])) AND (a.due_at < now()))) AS pending_tasks,
        CASE
            WHEN (sum(a.max_score) FILTER (WHERE (a.max_score IS NOT NULL)) = (0)::numeric) THEN NULL::numeric
            ELSE ((sum(COALESCE(a.score, (0)::numeric)) FILTER (WHERE (a.max_score IS NOT NULL)) * 1.0) / NULLIF(sum(a.max_score) FILTER (WHERE (a.max_score IS NOT NULL)), (0)::numeric))
        END AS grade_metric
   FROM ((public.students s
     LEFT JOIN public.assignments a ON ((a.student_id = s.id)))
     LEFT JOIN public.student_notes n ON (((n.student_id = s.id) AND (n.archived_at IS NULL))))
  WHERE (s.advisor_id IS NOT NULL)
  GROUP BY s.advisor_id, s.id, s.first_name, s.last_name, s.grade;


create or replace view "public"."parent_student_overview" as  SELECT s.parent_id,
    s.id AS student_id,
    concat_ws(' '::text, s.first_name, s.last_name) AS student_name,
    COALESCE(count(*) FILTER (WHERE ((a.status <> 'completed'::public.assignment_status) AND (a.due_at >= now()))), (0)::bigint) AS upcoming_assignments_count,
    COALESCE(count(*) FILTER (WHERE (a.status = 'completed'::public.assignment_status)), (0)::bigint) AS completed_assignments_count,
    COALESCE(count(*) FILTER (WHERE ((a.status <> 'completed'::public.assignment_status) AND (a.due_at < now()))), (0)::bigint) AS overdue_assignments_count,
    min(a.due_at) FILTER (WHERE ((a.status <> 'completed'::public.assignment_status) AND (a.due_at >= now()))) AS next_due_at,
    GREATEST(max(a.updated_at), max(a.created_at)) AS last_activity_at
   FROM (public.students s
     LEFT JOIN public.assignments a ON ((a.student_id = s.id)))
  WHERE (s.parent_id = auth.uid())
  GROUP BY s.parent_id, s.id, s.first_name, s.last_name;


create or replace view "public"."parent_student_signals" as  SELECT id AS student_id,
    parent_id,
    ((first_name || ' '::text) || COALESCE(last_name, ''::text)) AS student_name,
    ( SELECT count(*) AS count
           FROM public.assignments a
          WHERE ((a.student_id = s.id) AND (a.due_at < now()) AND (a.status <> ALL (ARRAY['completed'::public.assignment_status, 'archived'::public.assignment_status])))) AS overdue_count,
    ( SELECT json_build_object('title', a.title, 'due_at', a.due_at, 'type', a.type) AS json_build_object
           FROM public.assignments a
          WHERE ((a.student_id = s.id) AND (a.type = ANY (ARRAY['test'::text, 'project'::text])) AND ((a.due_at >= now()) AND (a.due_at <= (now() + '14 days'::interval))) AND (a.status <> ALL (ARRAY['completed'::public.assignment_status, 'archived'::public.assignment_status])))
          ORDER BY a.due_at
         LIMIT 1) AS next_big_item,
    ( SELECT (count(*) > 0)
           FROM public.assignments a
          WHERE ((a.student_id = s.id) AND (a.status <> ALL (ARRAY['completed'::public.assignment_status, 'archived'::public.assignment_status])))) AS has_active_plan,
    ( SELECT count(*) AS count
           FROM public.assignments a
          WHERE ((a.student_id = s.id) AND (a.is_suggested = true) AND (a.suggestion_status = 'pending'::text))) AS pending_suggestions
   FROM public.students s;




drop view if exists "public"."advisor_notes_with_profiles";

drop view if exists "public"."advisor_student_summary";

drop view if exists "public"."parent_children_report";

drop view if exists "public"."parent_student_overview";

drop view if exists "public"."parent_student_signals";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_advisor_invite(invite_code_input text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_record record;
BEGIN
  SELECT * INTO invite_record
  FROM public.advisor_invites
  WHERE upper(invite_code) = upper(invite_code_input)
  FOR UPDATE;

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF invite_record.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Update invite as accepted
  UPDATE public.advisor_invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = invite_record.id;

  -- Update user's role to advisor
  UPDATE public.profiles
  SET role = 'advisor'
  WHERE id = auth.uid();

  -- Create advisor_profile if not exists
  INSERT INTO public.advisor_profiles (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN invite_record.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_parent_invite(invite_code_input text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_record record;
BEGIN
  -- Find and lock the invite
  SELECT * INTO invite_record
  FROM public.parent_invites
  WHERE upper(invite_code) = upper(invite_code_input)
  FOR UPDATE;

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF invite_record.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Mark invite as accepted
  UPDATE public.parent_invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = invite_record.id;

  -- Create parent-student link (allows multiple parents)
  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (auth.uid(), invite_record.student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  -- Update user's role to parent if not already set
  UPDATE public.profiles
  SET role = 'parent'
  WHERE id = auth.uid() AND (role IS NULL OR role = 'student');

  RETURN invite_record.student_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_student_invite(invite_code_input text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  invite_record record;
begin
  select *
  into invite_record
  from public.student_invites
  where upper(invite_code) = upper(invite_code_input)
  for update;

  if invite_record is null then
    raise exception 'Invite not found';
  end if;

  if invite_record.accepted_at is not null then
    raise exception 'Invite already used';
  end if;

  if invite_record.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  update public.student_invites
  set accepted_at = now()
  where id = invite_record.id;

  update public.students
  set student_user_id = auth.uid()
  where id = invite_record.student_id
    and student_user_id is null;

  if not found then
    raise exception 'Student already linked';
  end if;

  return invite_record.student_id;
end;
$function$
;

create or replace view "public"."advisor_notes_with_profiles" as  SELECT an.id,
    an.advisor_id,
    an.student_id,
    an.message,
    an.priority,
    an.created_at,
    p.first_name AS advisor_first_name,
    p.last_name AS advisor_last_name,
    p.email AS advisor_email
   FROM (public.advisor_notes an
     LEFT JOIN public.profiles p ON ((p.id = an.advisor_id)));


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


CREATE OR REPLACE FUNCTION public."current_role"()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_parent_linked_student_ids(p_parent_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT student_id FROM public.parent_student_links
  WHERE parent_id = p_parent_id
  UNION
  SELECT id FROM public.students WHERE parent_id = p_parent_id;
$function$
;

CREATE OR REPLACE FUNCTION public.is_parent_linked_to_student(p_parent_id uuid, p_student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = p_parent_id AND student_id = p_student_id
  );
$function$
;

create or replace view "public"."parent_children_report" as  SELECT s.id AS student_id,
    s.parent_id,
    concat(s.first_name, ' ', COALESCE(s.last_name, ''::text)) AS student_name,
    s.grade,
    count(a.id) FILTER (WHERE (a.status <> ALL (ARRAY['completed'::public.assignment_status, 'done'::public.assignment_status, 'archived'::public.assignment_status]))) AS active_assignments,
    count(a.id) FILTER (WHERE (a.status = ANY (ARRAY['completed'::public.assignment_status, 'done'::public.assignment_status]))) AS completed_assignments,
    count(a.id) FILTER (WHERE ((a.status <> ALL (ARRAY['completed'::public.assignment_status, 'done'::public.assignment_status, 'archived'::public.assignment_status])) AND (a.due_at < now()))) AS overdue_assignments,
    round(avg(
        CASE
            WHEN (a.max_score > (0)::numeric) THEN ((a.score / a.max_score) * (100)::numeric)
            ELSE NULL::numeric
        END), 1) AS avg_grade_percent,
    max(a.completed_at) AS last_completion,
    max(a.created_at) AS last_assignment_added
   FROM (public.students s
     LEFT JOIN public.assignments a ON ((a.student_id = s.id)))
  GROUP BY s.id, s.parent_id, s.first_name, s.last_name, s.grade;


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


CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.sync_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into profiles (id, email, role, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      role = coalesce(profiles.role, excluded.role),
      name = coalesce(excluded.name, profiles.name);

  return new;
end;
$function$
;



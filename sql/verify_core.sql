\echo '============================================================'
\echo 'DB Verification Report'
\echo '============================================================'
\echo ''

\echo 'A1 Skill modules'
select 'skill_modules_count' as metric, count(*) as value
from public.skill_modules;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'skill_modules'
order by ordinal_position;

\echo ''
\echo 'A2 Skill assignments + mentor_notifications schema introspection'
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'skill_assignments'
order by ordinal_position;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'mentor_notifications'
order by ordinal_position;

\echo ''
\echo 'A3 Student notes'
select 'student_notes_count' as metric, count(*) as value
from public.student_notes;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'student_notes'
order by ordinal_position;

\echo ''
\echo 'A4 Schedule foundations (counts) + view definition + view rowcount'
select 'student_course_enrollments_count' as metric, count(*) as value
from public.student_course_enrollments;

select 'students_count' as metric, count(*) as value
from public.students;

select 'courses_count' as metric, count(*) as value
from public.courses;

select 'course_meetings_count' as metric, count(*) as value
from public.course_meetings;

select pg_get_viewdef('public.student_schedule_events'::regclass, true) as view_definition;

select 'student_schedule_events_count' as metric, count(*) as value
from public.student_schedule_events;

\echo ''
\echo 'A5 Parent data (parent_student_overview sample + advisor_notes count)'
select *
from public.parent_student_overview
limit 5;

select 'advisor_notes_count' as metric, count(*) as value
from public.advisor_notes;

\echo ''
\echo 'A6 Assignments (count + status distribution + status column type)'
select 'assignments_count' as metric, count(*) as value
from public.assignments;

select status, count(*) as value
from public.assignments
group by status
order by status;

select column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'assignments'
  and column_name = 'status';

\echo ''
\echo 'A7 Subjects (count + subjects columns) + courses.subject_id nullability'
select 'subjects_count' as metric, count(*) as value
from public.subjects;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'subjects'
order by ordinal_position;

select column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'courses'
  and column_name = 'subject_id';

\echo ''
\echo 'Courses RLS policies (pg_policies)'
select schemaname,
       tablename,
       policyname,
       roles,
       cmd,
       qual,
       with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'courses'
order by policyname;

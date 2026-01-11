create view public.student_schedule_events
with (security_invoker = true)
as
select
  enrollments.student_id,
  courses.id as course_id,
  courses.title,
  courses.teacher_name,
  courses.location,
  meetings.day_of_week,
  meetings.start_time,
  meetings.end_time,
  null::text as color
from public.student_course_enrollments as enrollments
join public.students as students
  on students.id = enrollments.student_id
join public.courses as courses
  on courses.id = enrollments.course_id
join public.course_meetings as meetings
  on meetings.course_id = courses.id
where students.student_user_id = auth.uid();

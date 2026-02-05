-- Create student_enrolled_courses view
-- This view returns all courses a student is enrolled in, regardless of schedule
-- Unlike student_schedule_events which requires course_meetings, this includes all enrolled courses

CREATE OR REPLACE VIEW public.student_enrolled_courses
WITH (security_invoker = true)
AS
SELECT
  sce.student_id,
  c.id AS course_id,
  c.title,
  c.teacher_name,
  c.location,
  c.created_by_student_id,
  null::text AS color
FROM public.student_course_enrollments sce
INNER JOIN public.students s ON s.id = sce.student_id
INNER JOIN public.courses c ON c.id = sce.course_id
WHERE s.student_user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON public.student_enrolled_courses TO authenticated;

-- Note: RLS is inherited from underlying tables via security_invoker = true

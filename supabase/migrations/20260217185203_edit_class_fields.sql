-- Add teacher_email to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS teacher_email TEXT;

-- Add color and semester grade columns to student_course_enrollments
ALTER TABLE public.student_course_enrollments
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS semester1_grade TEXT,
  ADD COLUMN IF NOT EXISTS semester2_grade TEXT,
  ADD COLUMN IF NOT EXISTS semester3_grade TEXT,
  ADD COLUMN IF NOT EXISTS semester4_grade TEXT,
  ADD COLUMN IF NOT EXISTS current_grade TEXT;

-- Students can update their own enrollments (color, grades)
DROP POLICY IF EXISTS student_course_enrollments_update_own ON public.student_course_enrollments;
CREATE POLICY student_course_enrollments_update_own
  ON public.student_course_enrollments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_course_enrollments.student_id
        AND s.student_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_course_enrollments.student_id
        AND s.student_user_id = auth.uid()
    )
  );

-- Recreate student_enrolled_courses view with new columns
-- Must DROP + CREATE because CREATE OR REPLACE cannot add columns
DROP VIEW IF EXISTS public.student_enrolled_courses;
CREATE VIEW public.student_enrolled_courses
WITH (security_invoker = true)
AS
SELECT
  sce.student_id,
  c.id AS course_id,
  c.title,
  c.teacher_name,
  c.teacher_email,
  c.location,
  c.created_by_student_id,
  sce.color,
  sce.semester1_grade,
  sce.semester2_grade,
  sce.semester3_grade,
  sce.semester4_grade,
  sce.current_grade
FROM public.student_course_enrollments sce
INNER JOIN public.students s ON s.id = sce.student_id
INNER JOIN public.courses c ON c.id = sce.course_id
WHERE s.student_user_id = auth.uid();

-- Re-grant access
GRANT SELECT ON public.student_enrolled_courses TO authenticated;

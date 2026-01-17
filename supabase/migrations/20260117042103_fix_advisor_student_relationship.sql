-- Slice 2: Fix advisor-student relationship
-- Problem: students.advisor_id is NULL even though student_advisor junction exists
-- Solution: Populate advisor_id from the student_advisor junction table

-- Update students.advisor_id using the primary advisor from student_advisor junction
UPDATE public.students s
SET advisor_id = sa.advisor_id
FROM public.student_advisor sa
WHERE sa.student_id = s.id
  AND sa.is_primary = true
  AND s.advisor_id IS NULL;

-- For any remaining students with advisors but no primary flag, use any advisor
UPDATE public.students s
SET advisor_id = (
  SELECT sa.advisor_id
  FROM public.student_advisor sa
  WHERE sa.student_id = s.id
  LIMIT 1
)
WHERE s.advisor_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.student_advisor sa WHERE sa.student_id = s.id
  );

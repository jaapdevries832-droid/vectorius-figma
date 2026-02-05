-- Fix Parent-Student Linking RLS
-- Parents linked via parent_student_links table should be able to see their students
-- This updates existing RLS policies to check BOTH legacy parent_id AND new junction table

-- =============================================================================
-- 1. Update students table RLS for parent SELECT
-- =============================================================================

-- Drop existing parent select policy if it exists
DROP POLICY IF EXISTS "students_parent_select" ON public.students;
DROP POLICY IF EXISTS "Parents can view linked students" ON public.students;

-- Create new policy that checks BOTH parent_id column AND parent_student_links table
CREATE POLICY "students_parent_select" ON public.students
  FOR SELECT USING (
    -- Legacy: direct parent_id match (for backwards compatibility)
    parent_id = auth.uid()
    OR
    -- New: via parent_student_links junction table
    id IN (
      SELECT student_id FROM public.parent_student_links
      WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. Update assignments table RLS for parent SELECT
-- =============================================================================

-- Drop existing parent select policy if it exists
DROP POLICY IF EXISTS "assignments_parent_select" ON public.assignments;
DROP POLICY IF EXISTS "Parents can view children assignments" ON public.assignments;

-- Create new policy that checks both linkage methods
CREATE POLICY "assignments_parent_select" ON public.assignments
  FOR SELECT USING (
    student_id IN (
      -- Legacy: students with direct parent_id
      SELECT id FROM public.students WHERE parent_id = auth.uid()
      UNION
      -- New: students linked via parent_student_links
      SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. Update student_notes table RLS for parent SELECT (if exists)
-- =============================================================================

DO $$
BEGIN
  -- Only update if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_notes' AND table_schema = 'public') THEN
    -- Drop existing policy
    DROP POLICY IF EXISTS "student_notes_parent_select" ON public.student_notes;
    DROP POLICY IF EXISTS "Parents can view student notes" ON public.student_notes;

    -- Create new policy
    EXECUTE '
      CREATE POLICY "student_notes_parent_select" ON public.student_notes
        FOR SELECT USING (
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
            UNION
            SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;

-- =============================================================================
-- 4. Update calendar_events table RLS for parent SELECT (if exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "calendar_events_parent_select" ON public.calendar_events;
    DROP POLICY IF EXISTS "Parents can view calendar events" ON public.calendar_events;

    EXECUTE '
      CREATE POLICY "calendar_events_parent_select" ON public.calendar_events
        FOR SELECT USING (
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
            UNION
            SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;

-- =============================================================================
-- 5. Update grades table RLS for parent SELECT (if exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "grades_parent_select" ON public.grades;
    DROP POLICY IF EXISTS "Parents can view grades" ON public.grades;

    EXECUTE '
      CREATE POLICY "grades_parent_select" ON public.grades
        FOR SELECT USING (
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
            UNION
            SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;

-- =============================================================================
-- End of migration
-- =============================================================================

-- Fix-forward: Restore student self-read RLS policy
-- The S4-A migration broke student access to their own records
-- This ensures all role-based SELECT policies exist correctly on students table

-- =============================================================================
-- 1. Ensure students can read their own record (CRITICAL FIX)
-- =============================================================================
-- Students need to access their own record via student_user_id
DROP POLICY IF EXISTS "students_student_select" ON public.students;
CREATE POLICY "students_student_select" ON public.students
  FOR SELECT USING (student_user_id = auth.uid());

-- =============================================================================
-- 2. Re-ensure parents can read linked students (both legacy and junction table)
-- =============================================================================
DROP POLICY IF EXISTS "students_parent_select" ON public.students;
CREATE POLICY "students_parent_select" ON public.students
  FOR SELECT USING (
    -- Legacy: direct parent_id match
    parent_id = auth.uid()
    OR
    -- New: via parent_student_links junction table
    id IN (
      SELECT student_id FROM public.parent_student_links
      WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. Ensure advisors can read assigned students
-- =============================================================================
DROP POLICY IF EXISTS "students_advisor_select" ON public.students;
CREATE POLICY "students_advisor_select" ON public.students
  FOR SELECT USING (advisor_id = auth.uid());

-- =============================================================================
-- End of fix-forward migration
-- =============================================================================

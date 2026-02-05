-- Fix-forward: Resolve infinite recursion in students RLS policy
-- The previous policy used a subquery to parent_student_links which has its own RLS
-- that references students, causing infinite recursion.
--
-- Solution: Create a SECURITY DEFINER function to check parent_student_links
-- without triggering RLS recursion.

-- =============================================================================
-- 1. Create helper function to check parent-student links (bypasses RLS)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_parent_linked_to_student(p_parent_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = p_parent_id AND student_id = p_student_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_parent_linked_to_student(uuid, uuid) TO authenticated;

-- =============================================================================
-- 2. Fix students_parent_select policy to use the helper function
-- =============================================================================
DROP POLICY IF EXISTS "students_parent_select" ON public.students;
CREATE POLICY "students_parent_select" ON public.students
  FOR SELECT USING (
    -- Legacy: direct parent_id match
    parent_id = auth.uid()
    OR
    -- New: via parent_student_links (using SECURITY DEFINER function to avoid recursion)
    public.is_parent_linked_to_student(auth.uid(), id)
  );

-- =============================================================================
-- 3. Ensure students_student_select policy exists
-- =============================================================================
DROP POLICY IF EXISTS "students_student_select" ON public.students;
CREATE POLICY "students_student_select" ON public.students
  FOR SELECT USING (student_user_id = auth.uid());

-- =============================================================================
-- 4. Ensure students_advisor_select policy exists
-- =============================================================================
DROP POLICY IF EXISTS "students_advisor_select" ON public.students;
CREATE POLICY "students_advisor_select" ON public.students
  FOR SELECT USING (advisor_id = auth.uid());

-- =============================================================================
-- 5. Fix assignments_parent_select policy (may also have recursion)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_parent_linked_student_ids(p_parent_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT student_id FROM public.parent_student_links
  WHERE parent_id = p_parent_id
  UNION
  SELECT id FROM public.students WHERE parent_id = p_parent_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_linked_student_ids(uuid) TO authenticated;

DROP POLICY IF EXISTS "assignments_parent_select" ON public.assignments;
CREATE POLICY "assignments_parent_select" ON public.assignments
  FOR SELECT USING (
    student_id IN (SELECT public.get_parent_linked_student_ids(auth.uid()))
  );

-- =============================================================================
-- End of fix-forward migration
-- =============================================================================

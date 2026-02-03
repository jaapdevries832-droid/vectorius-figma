-- Migration: parent_student_links
-- Purpose: Junction table for many-to-many parent-student relationships
-- This allows multiple parents per student (e.g., both parents can have accounts)

CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text DEFAULT 'parent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON public.parent_student_links(student_id);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Parents can read their own links
CREATE POLICY "parents_read_own_links" ON public.parent_student_links
  FOR SELECT USING (parent_id = auth.uid());

-- Students can read links to themselves
CREATE POLICY "students_read_own_links" ON public.parent_student_links
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE student_user_id = auth.uid()
    )
  );

-- Parents can insert links (when accepting invite)
CREATE POLICY "parents_insert_links" ON public.parent_student_links
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- Advisors can read links for their assigned students
CREATE POLICY "advisors_read_student_links" ON public.parent_student_links
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE advisor_id = auth.uid()
    )
  );

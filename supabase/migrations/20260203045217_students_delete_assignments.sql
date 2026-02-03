-- Allow students to delete their own assignments
CREATE POLICY "students_delete_own_assignments" ON public.assignments
  FOR DELETE USING (
    student_id IN (
      SELECT id FROM public.students
      WHERE student_user_id = auth.uid()
    )
  );

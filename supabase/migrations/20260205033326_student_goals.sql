-- Student goals table for custom awards/goals
CREATE TABLE IF NOT EXISTS student_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_student_goals_student_id ON student_goals(student_id);

-- Enable RLS
ALTER TABLE student_goals ENABLE ROW LEVEL SECURITY;

-- Students can view their own goals
CREATE POLICY "students_view_own_goals" ON student_goals
  FOR SELECT USING (
    auth.uid() IN (
      SELECT student_user_id FROM students WHERE id = student_goals.student_id
    )
  );

-- Students can insert their own goals
CREATE POLICY "students_insert_own_goals" ON student_goals
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT student_user_id FROM students WHERE id = student_goals.student_id
    )
  );

-- Students can update their own goals
CREATE POLICY "students_update_own_goals" ON student_goals
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT student_user_id FROM students WHERE id = student_goals.student_id
    )
  );

-- Students can delete their own goals
CREATE POLICY "students_delete_own_goals" ON student_goals
  FOR DELETE USING (
    auth.uid() IN (
      SELECT student_user_id FROM students WHERE id = student_goals.student_id
    )
  );

-- Parents can view their linked students' goals (via parent_student_links)
CREATE POLICY "parents_view_linked_goals" ON student_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = student_goals.student_id
    )
  );

-- Advisors can view their students' goals
CREATE POLICY "advisors_view_student_goals" ON student_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_goals.student_id
        AND s.advisor_id = auth.uid()
    )
  );

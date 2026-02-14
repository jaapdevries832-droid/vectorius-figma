-- Parent notes: notes written by parents to students and/or advisors
CREATE TABLE IF NOT EXISTS parent_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'both'
    CHECK (recipient_type IN ('student', 'advisor', 'both')),
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parent_notes_parent ON parent_notes(parent_user_id);
CREATE INDEX idx_parent_notes_student ON parent_notes(student_id);

ALTER TABLE parent_notes ENABLE ROW LEVEL SECURITY;

-- Parents can CRUD their own notes
CREATE POLICY "parents_crud_own_notes" ON parent_notes
  FOR ALL USING (auth.uid() = parent_user_id);

-- Students can read notes addressed to them
CREATE POLICY "students_read_parent_notes" ON parent_notes
  FOR SELECT USING (
    recipient_type IN ('student', 'both')
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = parent_notes.student_id
        AND s.student_user_id = auth.uid()
    )
  );

-- Advisors can read notes for their assigned students
CREATE POLICY "advisors_read_parent_notes" ON parent_notes
  FOR SELECT USING (
    recipient_type IN ('advisor', 'both')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN profiles p ON p.id = s.advisor_id
      WHERE s.id = parent_notes.student_id
        AND p.id = auth.uid()
        AND p.role = 'advisor'
    )
  );

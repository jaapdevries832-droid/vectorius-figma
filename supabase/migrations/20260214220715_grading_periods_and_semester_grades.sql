-- Grading periods (semesters, quarters, etc.)
CREATE TABLE IF NOT EXISTS grading_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'semester'
    CHECK (period_type IN ('semester', 'quarter', 'trimester', 'year')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grading_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_authenticated_read_grading_periods" ON grading_periods
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed common periods
INSERT INTO grading_periods (name, period_type, start_date, end_date) VALUES
  ('Fall 2024', 'semester', '2024-08-15', '2024-12-20'),
  ('Spring 2025', 'semester', '2025-01-06', '2025-05-30'),
  ('Fall 2025', 'semester', '2025-08-15', '2025-12-19'),
  ('Spring 2026', 'semester', '2026-01-05', '2026-05-29');

-- Semester grades (parent-entered historical grades)
CREATE TABLE IF NOT EXISTS semester_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  grading_period_id UUID NOT NULL REFERENCES grading_periods(id) ON DELETE CASCADE,
  course_name_override TEXT,
  grade_letter TEXT,
  grade_percent REAL,
  entered_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_semester_grades_student ON semester_grades(student_id);
CREATE INDEX idx_semester_grades_period ON semester_grades(grading_period_id);

ALTER TABLE semester_grades ENABLE ROW LEVEL SECURITY;

-- Parents can CRUD grades for their students
CREATE POLICY "parents_manage_semester_grades" ON semester_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = semester_grades.student_id
        AND s.parent_id = auth.uid()
    )
  );

-- Students can read their own grades
CREATE POLICY "students_read_own_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = semester_grades.student_id
        AND s.student_user_id = auth.uid()
    )
  );

-- Advisors can read grades for assigned students
CREATE POLICY "advisors_read_student_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = semester_grades.student_id
        AND s.advisor_id = auth.uid()
    )
  );

-- Add archived_at to courses for soft-delete/archiving
ALTER TABLE courses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

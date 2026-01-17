-- Seed sample assignments for Maya to show grade metrics
-- Maya's student record is found by first_name = 'Maya' or email pattern

DO $$
DECLARE
  v_maya_student_id UUID;
  v_maya_advisor_id UUID;
BEGIN
  -- Find Maya's student ID
  SELECT id, advisor_id INTO v_maya_student_id, v_maya_advisor_id
  FROM public.students
  WHERE first_name = 'Maya' OR email = 'maya.test@vectorius.local'
  LIMIT 1;

  IF v_maya_student_id IS NULL THEN
    RAISE NOTICE 'Maya student record not found, skipping seed';
    RETURN;
  END IF;

  -- Insert sample completed assignments with scores
  -- Only insert if no assignments exist for Maya yet
  IF NOT EXISTS (SELECT 1 FROM public.assignments WHERE student_id = v_maya_student_id LIMIT 1) THEN
    INSERT INTO public.assignments (
      student_id, title, description, due_at, status, priority, score, max_score, completed_at, created_by
    ) VALUES
    -- Completed assignments with grades
    (v_maya_student_id, 'Math Chapter 5 Homework', 'Complete problems 1-20', NOW() - INTERVAL '7 days', 'completed', 'medium', 18, 20, NOW() - INTERVAL '6 days', v_maya_advisor_id),
    (v_maya_student_id, 'Science Quiz - Forces', 'Quiz on Newton''s Laws', NOW() - INTERVAL '5 days', 'completed', 'high', 85, 100, NOW() - INTERVAL '4 days', v_maya_advisor_id),
    (v_maya_student_id, 'English Essay Draft', 'First draft of persuasive essay', NOW() - INTERVAL '3 days', 'completed', 'medium', 42, 50, NOW() - INTERVAL '2 days', v_maya_advisor_id),
    (v_maya_student_id, 'History Reading Response', 'Chapter 8 reading questions', NOW() - INTERVAL '2 days', 'completed', 'low', 9, 10, NOW() - INTERVAL '1 day', v_maya_advisor_id),
    -- Upcoming assignments (no scores yet)
    (v_maya_student_id, 'Math Chapter 6 Test', 'Unit test covering chapters 5-6', NOW() + INTERVAL '3 days', 'not_started', 'high', NULL, 100, NULL, v_maya_advisor_id),
    (v_maya_student_id, 'Science Lab Report', 'Write up experiment results', NOW() + INTERVAL '5 days', 'in_progress', 'medium', NULL, 50, NULL, v_maya_advisor_id),
    (v_maya_student_id, 'English Final Essay', 'Final version of persuasive essay', NOW() + INTERVAL '7 days', 'not_started', 'high', NULL, 100, NULL, v_maya_advisor_id);

    RAISE NOTICE 'Inserted 7 sample assignments for Maya (student_id: %)', v_maya_student_id;
  ELSE
    RAISE NOTICE 'Maya already has assignments, skipping seed';
  END IF;
END $$;

-- Add scores to Maya's existing assignments so parent dashboard shows grade metrics

DO $$
DECLARE
  v_maya_student_id UUID;
  v_assignment_count INT;
BEGIN
  -- Find Maya's student ID
  SELECT id INTO v_maya_student_id
  FROM public.students
  WHERE first_name = 'Maya' OR email = 'maya.test@vectorius.local'
  LIMIT 1;

  IF v_maya_student_id IS NULL THEN
    RAISE NOTICE 'Maya student record not found, skipping';
    RETURN;
  END IF;

  -- Count assignments without scores
  SELECT COUNT(*) INTO v_assignment_count
  FROM public.assignments
  WHERE student_id = v_maya_student_id
    AND (score IS NULL OR max_score IS NULL);

  IF v_assignment_count = 0 THEN
    RAISE NOTICE 'All of Maya''s assignments already have scores';
    RETURN;
  END IF;

  -- Update existing assignments with sample scores
  -- Mark some as completed with scores, leave others as upcoming
  UPDATE public.assignments
  SET
    score = CASE
      WHEN status = 'completed' THEN FLOOR(RANDOM() * 15 + 85)  -- 85-100 range
      ELSE NULL
    END,
    max_score = 100,
    completed_at = CASE
      WHEN status = 'completed' THEN due_at - INTERVAL '1 day'
      ELSE NULL
    END
  WHERE student_id = v_maya_student_id
    AND (score IS NULL OR max_score IS NULL);

  -- If no completed assignments, update the first few to be completed with scores
  IF NOT EXISTS (
    SELECT 1 FROM public.assignments
    WHERE student_id = v_maya_student_id AND status = 'completed'
  ) THEN
    -- Mark oldest assignments as completed with scores
    WITH oldest_assignments AS (
      SELECT id
      FROM public.assignments
      WHERE student_id = v_maya_student_id
      ORDER BY due_at ASC
      LIMIT 3
    )
    UPDATE public.assignments a
    SET
      status = 'completed',
      score = 88,
      max_score = 100,
      completed_at = NOW() - INTERVAL '1 day'
    FROM oldest_assignments oa
    WHERE a.id = oa.id;

    RAISE NOTICE 'Marked 3 oldest assignments as completed with scores for Maya';
  END IF;

  RAISE NOTICE 'Updated scores for Maya''s assignments (student_id: %)', v_maya_student_id;
END $$;

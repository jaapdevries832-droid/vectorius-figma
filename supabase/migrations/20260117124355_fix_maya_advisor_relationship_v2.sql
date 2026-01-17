-- Fix-forward: Ensure Maya's advisor_id matches Michael's auth UUID
-- This addresses the issue where Michael cannot see Maya in his roster

DO $$
DECLARE
  v_maya_id UUID;
  v_current_advisor_id UUID;
  v_michael_uuid UUID := '8bab11ff-be97-4a6e-b38b-e8224932bb96';
BEGIN
  -- Find Maya's student record
  SELECT id, advisor_id INTO v_maya_id, v_current_advisor_id
  FROM public.students
  WHERE first_name = 'Maya' OR email = 'maya.test@vectorius.local'
  LIMIT 1;

  IF v_maya_id IS NULL THEN
    RAISE NOTICE 'Maya student record not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Maya student_id: %, current advisor_id: %', v_maya_id, v_current_advisor_id;

  -- Update if needed
  IF v_current_advisor_id IS NULL OR v_current_advisor_id != v_michael_uuid THEN
    UPDATE public.students
    SET advisor_id = v_michael_uuid
    WHERE id = v_maya_id;

    RAISE NOTICE 'Updated Maya advisor_id from % to %', v_current_advisor_id, v_michael_uuid;
  ELSE
    RAISE NOTICE 'Maya advisor_id already correct: %', v_current_advisor_id;
  END IF;
END $$;

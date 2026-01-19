-- Fix-forward: Ensure Maya has a student record with correct student_user_id
-- This creates the record if it doesn't exist, and updates it if it does
-- Note: Wrapped in auth.users check for shadow database compatibility (supabase db pull)

-- Maya's auth user ID: 860b887a-521d-42b9-a8c9-308144fc0e64
-- Sarah's auth user ID (parent): 09345bb5-e880-441f-88b1-d39ca655d6c3
-- Michael's auth user ID (advisor): 8bab11ff-be97-4a6e-b38b-e8224932bb96

DO $$
DECLARE
  v_maya_student_id UUID;
  v_maya_user_id UUID := '860b887a-521d-42b9-a8c9-308144fc0e64';
  v_sarah_parent_id UUID := '09345bb5-e880-441f-88b1-d39ca655d6c3';
  v_michael_advisor_id UUID := '8bab11ff-be97-4a6e-b38b-e8224932bb96';
BEGIN
  -- Skip entire block if auth users don't exist (shadow database scenario)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_maya_user_id) THEN
    RAISE NOTICE 'Skipping Maya student setup - auth users not present (shadow database)';
    RETURN;
  END IF;

  -- First, try to find any existing student record with student_user_id matching Maya's auth
  SELECT id INTO v_maya_student_id
  FROM public.students
  WHERE student_user_id = v_maya_user_id
  LIMIT 1;

  IF v_maya_student_id IS NOT NULL THEN
    RAISE NOTICE 'Found Maya by student_user_id: %', v_maya_student_id;
  ELSE
    -- Try to find by name or email
    SELECT id INTO v_maya_student_id
    FROM public.students
    WHERE first_name ILIKE 'Maya' OR email ILIKE '%maya%'
    LIMIT 1;

    IF v_maya_student_id IS NOT NULL THEN
      RAISE NOTICE 'Found Maya by name/email: %, updating student_user_id', v_maya_student_id;
      UPDATE public.students
      SET student_user_id = v_maya_user_id
      WHERE id = v_maya_student_id;
    END IF;
  END IF;

  -- If no student record exists, create one
  IF v_maya_student_id IS NULL THEN
    RAISE NOTICE 'No Maya student record found, creating one';
    INSERT INTO public.students (
      first_name,
      last_name,
      email,
      grade,
      parent_id,
      advisor_id,
      student_user_id
    ) VALUES (
      'Maya',
      'Test',
      'maya.test@vectorius.local',
      '7th',
      v_sarah_parent_id,
      v_michael_advisor_id,
      v_maya_user_id
    )
    RETURNING id INTO v_maya_student_id;

    RAISE NOTICE 'Created Maya student record: %', v_maya_student_id;
  END IF;

  -- Ensure advisor_id is set correctly
  UPDATE public.students
  SET advisor_id = v_michael_advisor_id
  WHERE id = v_maya_student_id
    AND (advisor_id IS NULL OR advisor_id != v_michael_advisor_id);

  -- Ensure student_user_id is set correctly
  UPDATE public.students
  SET student_user_id = v_maya_user_id
  WHERE id = v_maya_student_id
    AND (student_user_id IS NULL OR student_user_id != v_maya_user_id);

  -- Ensure parent link exists
  INSERT INTO public.student_parent (student_id, parent_id, relation)
  VALUES (v_maya_student_id, v_sarah_parent_id, 'guardian')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Maya student setup complete: student_id=%, student_user_id=%, advisor_id=%',
    v_maya_student_id, v_maya_user_id, v_michael_advisor_id;
END $$;

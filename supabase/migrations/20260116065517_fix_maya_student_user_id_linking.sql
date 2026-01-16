-- Slice 1: Fix Student Profile Linking for Maya Test Persona
-- Problem: Maya (student) sees "No student profile found" after login
-- because students.student_user_id is not linked to her auth user
--
-- User IDs (from Supabase Auth):
-- Maya (student):  860b887a-521d-42b9-a8c9-308144fc0e64

-- Link Maya's student record to her auth user
UPDATE public.students
SET student_user_id = '860b887a-521d-42b9-a8c9-308144fc0e64'
WHERE (email = 'maya.test@vectorius.local' OR first_name = 'Maya')
  AND student_user_id IS NULL;

-- Ensure Maya has a profile record with student role
INSERT INTO public.profiles (id, role, first_name, last_name)
VALUES ('860b887a-521d-42b9-a8c9-308144fc0e64', 'student', 'Maya', 'Test')
ON CONFLICT (id) DO UPDATE SET
  role = 'student',
  first_name = COALESCE(profiles.first_name, 'Maya'),
  last_name = COALESCE(profiles.last_name, 'Test');

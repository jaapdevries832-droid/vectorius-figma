-- Fix-forward: Unconditionally set Maya's student_user_id
-- Previous migration may have failed to match due to conditions
--
-- Maya's auth user id: 860b887a-521d-42b9-a8c9-308144fc0e64

-- Update any student named Maya to have the correct student_user_id
UPDATE public.students
SET student_user_id = '860b887a-521d-42b9-a8c9-308144fc0e64'
WHERE first_name = 'Maya'
  AND (student_user_id IS NULL OR student_user_id != '860b887a-521d-42b9-a8c9-308144fc0e64');

-- Also check by email pattern
UPDATE public.students
SET student_user_id = '860b887a-521d-42b9-a8c9-308144fc0e64'
WHERE email ILIKE '%maya%'
  AND (student_user_id IS NULL OR student_user_id != '860b887a-521d-42b9-a8c9-308144fc0e64');

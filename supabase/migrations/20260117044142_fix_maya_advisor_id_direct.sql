-- Fix-forward: Directly set Maya's advisor_id to Michael's user ID
-- The previous migration used student_advisor.advisor_id which references advisors(id),
-- but students.advisor_id references profiles(id) (the auth user ID).
-- Since Michael's advisors.id equals his profiles.id, this should work,
-- but let's set it directly to be certain.

-- Michael's auth user ID / profile ID
-- (from test personas: 8bab11ff-be97-4a6e-b38b-e8224932bb96)

UPDATE public.students
SET advisor_id = '8bab11ff-be97-4a6e-b38b-e8224932bb96'
WHERE (first_name = 'Maya' OR email = 'maya.test@vectorius.local')
  AND (advisor_id IS NULL OR advisor_id != '8bab11ff-be97-4a6e-b38b-e8224932bb96');

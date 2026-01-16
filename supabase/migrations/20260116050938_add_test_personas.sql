-- Add test personas for AI testing
-- Sarah (parent) and Michael (advisor)

-- User IDs (from Supabase Auth):
-- Maya (student):  860b887a-521d-42b9-a8c9-308144fc0e64
-- Sarah (parent):  09345bb5-e880-441f-88b1-d39ca655d6c3
-- Michael (advisor): 8bab11ff-be97-4a6e-b38b-e8224932bb96

-- 1. Create profile for Sarah (parent)
INSERT INTO public.profiles (id, role, first_name, last_name)
VALUES ('09345bb5-e880-441f-88b1-d39ca655d6c3', 'parent', 'Sarah', 'Test')
ON CONFLICT (id) DO UPDATE SET
  role = 'parent',
  first_name = 'Sarah',
  last_name = 'Test';

-- 2. Create profile for Michael (advisor)
INSERT INTO public.profiles (id, role, first_name, last_name)
VALUES ('8bab11ff-be97-4a6e-b38b-e8224932bb96', 'advisor', 'Michael', 'Test')
ON CONFLICT (id) DO UPDATE SET
  role = 'advisor',
  first_name = 'Michael',
  last_name = 'Test';

-- 3. Create advisor record for Michael
INSERT INTO public.advisors (id, first_name, last_name, email, specialization)
VALUES (
  '8bab11ff-be97-4a6e-b38b-e8224932bb96',
  'Michael',
  'Test',
  'michael.test@vectorius.local',
  'General'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = 'Michael',
  last_name = 'Test';

-- 4. Create parent record for Sarah
INSERT INTO public.parents (id, first_name, last_name, email, kind)
VALUES (
  '09345bb5-e880-441f-88b1-d39ca655d6c3',
  'Sarah',
  'Test',
  'sarah.test@vectorius.local',
  'guardian'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = 'Sarah',
  last_name = 'Test';

-- 5. Link Sarah to Maya's student record (using Maya's profile ID to find student)
-- First, we need to find Maya's student_id
INSERT INTO public.student_parent (student_id, parent_id, relation)
SELECT s.id, '09345bb5-e880-441f-88b1-d39ca655d6c3', 'guardian'
FROM public.students s
WHERE s.email = 'maya.test@vectorius.local'
   OR s.first_name = 'Maya'
ON CONFLICT DO NOTHING;

-- 6. Link Michael to Maya's student record
INSERT INTO public.student_advisor (student_id, advisor_id, is_primary)
SELECT s.id, '8bab11ff-be97-4a6e-b38b-e8224932bb96', true
FROM public.students s
WHERE s.email = 'maya.test@vectorius.local'
   OR s.first_name = 'Maya'
ON CONFLICT DO NOTHING;

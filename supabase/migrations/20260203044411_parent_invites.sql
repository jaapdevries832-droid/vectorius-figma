-- Migration: parent_invites
-- Purpose: Allow students to invite parents via invite codes

CREATE TABLE IF NOT EXISTS public.parent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_invites_code ON public.parent_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_parent_invites_student ON public.parent_invites(student_id);

ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;

-- Students can manage invites for themselves
CREATE POLICY "students_manage_own_invites" ON public.parent_invites
  FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE student_user_id = auth.uid())
  );

-- Anyone authenticated can read invites by code (for validation during acceptance)
CREATE POLICY "authenticated_read_invites" ON public.parent_invites
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function to accept parent invite
CREATE OR REPLACE FUNCTION public.accept_parent_invite(invite_code_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record record;
BEGIN
  -- Find and lock the invite
  SELECT * INTO invite_record
  FROM public.parent_invites
  WHERE upper(invite_code) = upper(invite_code_input)
  FOR UPDATE;

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF invite_record.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Mark invite as accepted
  UPDATE public.parent_invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = invite_record.id;

  -- Create parent-student link (allows multiple parents)
  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (auth.uid(), invite_record.student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  -- Update user's role to parent if not already set
  UPDATE public.profiles
  SET role = 'parent'
  WHERE id = auth.uid() AND (role IS NULL OR role = 'student');

  RETURN invite_record.student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_parent_invite(text) TO authenticated;

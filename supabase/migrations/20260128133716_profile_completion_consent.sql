-- Migration: Profile Completion Infrastructure (S1-A)
-- Purpose: Add profile completion tracking fields and consent table

-- Profile completion fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Consent tracking table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type text NOT NULL, -- 'ai_coach_rules', 'terms_of_service', 'privacy_policy'
  consent_version text NOT NULL DEFAULT '1.0',
  consented_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (user_id, consent_type)
);

-- Index for efficient consent lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);

-- Enable RLS on user_consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can read their own consents
CREATE POLICY "user_consents_select_own" ON public.user_consents
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own consents
CREATE POLICY "user_consents_insert_own" ON public.user_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own consents (for re-consent scenarios)
CREATE POLICY "user_consents_update_own" ON public.user_consents
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add preferred_subjects array to students for quick reference
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS preferred_subjects text[];

-- Comment on new columns for documentation
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone (IANA format, e.g., America/New_York)';
COMMENT ON COLUMN public.profiles.profile_completed_at IS 'Timestamp when basic profile fields were completed';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when full onboarding (including consent) was completed';
COMMENT ON TABLE public.user_consents IS 'Tracks user consent to various policies and terms';
COMMENT ON COLUMN public.students.preferred_subjects IS 'Quick reference for student subject preferences';

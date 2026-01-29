"use client";

import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProfileCompletionModal } from "./ProfileCompletionModal";

type ProfileCompletionGateProps = {
  children: ReactNode;
};

type ProfileData = {
  id: string;
  role: "student" | "parent" | "advisor";
  first_name: string | null;
  last_name: string | null;
  onboarding_completed_at: string | null;
};

export function ProfileCompletionGate({ children }: ProfileCompletionGateProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("id, role, first_name, last_name, onboarding_completed_at")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Failed to fetch profile:", error);
          setLoading(false);
          return;
        }

        setProfile(profileData as ProfileData);

        // Show modal if onboarding not completed
        if (!profileData.onboarding_completed_at) {
          setShowModal(true);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleOnboardingComplete = () => {
    setShowModal(false);
    // Refresh profile data
    if (profile) {
      setProfile({
        ...profile,
        onboarding_completed_at: new Date().toISOString(),
      });
    }
  };

  // Show loading state while checking profile
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // If no profile, let the dashboard handle auth redirect
  if (!profile) {
    return <>{children}</>;
  }

  // If onboarding is complete, render the dashboard
  if (profile.onboarding_completed_at && !showModal) {
    return <>{children}</>;
  }

  // Show modal for incomplete onboarding
  return (
    <>
      {/* Render children in background (blurred by modal overlay) */}
      <div className="pointer-events-none opacity-50 blur-sm">
        {children}
      </div>

      <ProfileCompletionModal
        open={showModal}
        userId={profile.id}
        role={profile.role}
        existingFirstName={profile.first_name}
        existingLastName={profile.last_name}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}

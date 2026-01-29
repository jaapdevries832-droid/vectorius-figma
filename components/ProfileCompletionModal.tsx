"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { TimezoneSelect } from "./TimezoneSelect";
import { HouseRulesContent } from "./HouseRulesContent";
import { supabase } from "@/lib/supabase/client";

type ProfileCompletionModalProps = {
  open: boolean;
  userId: string;
  role: "student" | "parent" | "advisor";
  existingFirstName?: string | null;
  existingLastName?: string | null;
  onComplete: () => void;
};

type Step = "profile" | "consent";

export function ProfileCompletionModal({
  open,
  userId,
  role,
  existingFirstName,
  existingLastName,
  onComplete,
}: ProfileCompletionModalProps) {
  const [step, setStep] = useState<Step>("profile");
  const [firstName, setFirstName] = useState(existingFirstName ?? "");
  const [lastName, setLastName] = useState(existingLastName ?? "");
  const [timezone, setTimezone] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTimezoneChange = useCallback((value: string) => {
    setTimezone(value);
  }, []);

  const handleProfileNext = () => {
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (role === "advisor" && !lastName.trim()) {
      setError("Last name is required for advisors");
      return;
    }
    if (!timezone) {
      setError("Please select your timezone");
      return;
    }
    setError(null);
    setStep("consent");
  };

  const handleConsentSubmit = async () => {
    if (!consentChecked) {
      setError("Please agree to the guidelines to continue");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update profile with completion info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          timezone: timezone,
          profile_completed_at: new Date().toISOString(),
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      // Insert consent record
      const { error: consentError } = await supabase
        .from("user_consents")
        .upsert({
          user_id: userId,
          consent_type: "ai_coach_rules",
          consent_version: "1.0",
          consented_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,consent_type",
        });

      if (consentError) {
        throw consentError;
      }

      onComplete();
    } catch (err) {
      console.error("Failed to complete profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("profile");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "profile" ? "Complete Your Profile" : "Community Guidelines"}
          </DialogTitle>
          <DialogDescription>
            {step === "profile"
              ? "Tell us a bit about yourself to get started."
              : "Please review and agree to our guidelines."}
          </DialogDescription>
        </DialogHeader>

        {step === "profile" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name {role === "advisor" && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timezone <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <TimezoneSelect value={timezone} onChange={handleTimezoneChange} />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                We detected your timezone automatically. Change it if needed.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={handleProfileNext}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continue
            </button>
          </div>
        )}

        {step === "consent" && (
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto">
              <HouseRulesContent role={role} />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to follow the Vectorius community guidelines.
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConsentSubmit}
                disabled={isLoading || !consentChecked}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Get Started"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

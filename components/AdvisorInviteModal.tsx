"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { supabase } from "@/lib/supabase/client";

type AdvisorInviteModalProps = {
  open: boolean;
  onClose: () => void;
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function AdvisorInviteModal({ open, onClose }: AdvisorInviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setCopied(false);

    const code = generateCode();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    const { error: insertError } = await supabase.from("advisor_invites").insert({
      invite_code: code,
      email: email.trim() || null,
      expires_at: expires.toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    setInviteCode(code);
    setExpiresAt(expires.toISOString());
    setIsLoading(false);
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleClose = () => {
    setInviteCode(null);
    setExpiresAt(null);
    setError(null);
    setEmail("");
    setCopied(false);
    onClose();
  };

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/advisor`
    : "/join/advisor";

  const mailtoHref = inviteCode
    ? `mailto:${email}?subject=${encodeURIComponent(
        "You're invited to join Vectorius as an Advisor"
      )}&body=${encodeURIComponent(
        `You've been invited to join Vectorius as an advisor!\n\nUse this invite code: ${inviteCode}\n\nGo to: ${joinUrl}`
      )}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? handleClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a New Advisor</DialogTitle>
          <DialogDescription>
            Generate an invite code to share with a colleague who wants to join as an advisor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Invite code</div>
            <div className="mt-2 text-2xl font-semibold tracking-widest text-gray-900">
              {inviteCode ?? "--------"}
            </div>
            {expiresAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                Expires {new Date(expiresAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Share this code with the person you want to invite. They can use it at{" "}
            <span className="font-mono text-gray-700">/join/advisor</span> to create their account.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              {isLoading ? "Generating..." : inviteCode ? "Generate new code" : "Generate code"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!inviteCode}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email invite (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@email.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <a
              href={mailtoHref}
              className={`block rounded-lg border border-border px-4 py-2 text-center text-sm ${
                inviteCode ? "hover:bg-muted" : "pointer-events-none opacity-60"
              }`}
            >
              Send email with code
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

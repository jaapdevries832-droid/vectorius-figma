"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

type ParentInviteModalProps = {
  open: boolean;
  studentName?: string;
  inviteCode: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  error: string | null;
  email: string;
  onEmailChange: (value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onClose: () => void;
};

export function ParentInviteModal({
  open,
  inviteCode,
  expiresAt,
  isLoading,
  error,
  email,
  onEmailChange,
  onGenerate,
  onCopy,
  onClose,
}: ParentInviteModalProps) {
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/parent`
    : "/join/parent";

  const mailtoHref = inviteCode
    ? `mailto:${email}?subject=${encodeURIComponent(
        `Join me on Vectorius as my parent`
      )}&body=${encodeURIComponent(
        `Hi!\n\nI'd like to invite you to join Vectorius as my parent. Use this invite code: ${inviteCode}\n\nGo to: ${joinUrl}\n\nThanks!`
      )}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a Parent</DialogTitle>
          <DialogDescription>
            Share this code with your parent so they can create an account and connect with you.
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
            Your parent should go to <strong>/join/parent</strong> and enter this code to create their account.
            Multiple parents can use different codes to connect to your account.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              {inviteCode ? "Generate new code" : "Generate code"}
            </button>
            <button
              type="button"
              onClick={onCopy}
              disabled={!inviteCode}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              Copy code
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email invite (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="parent@email.com"
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

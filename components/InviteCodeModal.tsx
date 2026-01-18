"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

type InviteCodeModalProps = {
  open: boolean;
  studentName: string;
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

export function InviteCodeModal({
  open,
  studentName,
  inviteCode,
  expiresAt,
  isLoading,
  error,
  email,
  onEmailChange,
  onGenerate,
  onCopy,
  onClose,
}: InviteCodeModalProps) {
  const mailtoHref = inviteCode
    ? `mailto:${email}?subject=${encodeURIComponent(
        `Join ${studentName} on Vectorius`
      )}&body=${encodeURIComponent(
        `Use this invite code to link your account: ${inviteCode}`
      )}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite code for {studentName}</DialogTitle>
          <DialogDescription>
            Share this code with the student so they can link their account.
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              {inviteCode ? "Regenerate code" : "Generate code"}
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
              placeholder="student@email.com"
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

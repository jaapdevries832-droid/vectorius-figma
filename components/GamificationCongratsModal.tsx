"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Trophy, Flame, Award, CheckCircle } from "lucide-react";

export function GamificationCongratsModal({
  open,
  onClose,
  pointsEarned,
  streakDays,
  unlockedBadges = [],
  onViewBadges,
}: {
  open: boolean;
  onClose: () => void;
  pointsEarned: number;
  streakDays: number;
  unlockedBadges?: string[];
  onViewBadges: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="rounded-2xl border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            Nice work!
          </DialogTitle>
          <DialogDescription>Assignment completed</DialogDescription>
        </DialogHeader>
        <div className="space-grid-4 py-2">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-amber-700">Points earned</div>
              <div className="text-xl font-semibold text-amber-700">+{pointsEarned} pts</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-orange-700">Daily Streak</div>
              <div className="text-xl font-semibold text-orange-700">{streakDays} days</div>
            </div>
          </div>
          {unlockedBadges.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-emerald-700">New Badge Unlocked</div>
                <div className="text-sm font-medium text-emerald-700">{unlockedBadges.join(', ')}</div>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
            <Button className="rounded-xl bg-gradient-primary text-white btn-glow" onClick={onViewBadges}>See your badges</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GamificationCongratsModal;


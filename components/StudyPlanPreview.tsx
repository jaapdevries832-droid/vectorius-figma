"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CalendarDays, Clock, Sparkles } from "lucide-react";

export type StudyMilestone = {
  title: string;
  date: string;
  start_time: string;
  duration_minutes: number;
};

type StudyPlanPreviewProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  isLoading: boolean;
  assignmentTitle: string;
  dueDate: string | null;
  milestones: StudyMilestone[];
};

export function StudyPlanPreview({
  open,
  onClose,
  onAccept,
  isLoading,
  assignmentTitle,
  dueDate,
  milestones,
}: StudyPlanPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass border-0 shadow-2xl rounded-3xl p-8">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Study Plan Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="text-sm font-medium text-indigo-900">{assignmentTitle}</p>
            {dueDate && (
              <p className="text-xs text-indigo-700 mt-1">
                Due {new Date(dueDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {milestones.length === 0 && (
            <p className="text-sm text-muted-foreground">No milestones generated yet.</p>
          )}

          <div className="grid gap-4">
            {milestones.map((milestone, index) => (
              <div key={`${milestone.title}-${index}`} className="rounded-2xl border p-4 bg-white/70">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    Step {index + 1}
                  </Badge>
                  <p className="font-medium text-gray-900">{milestone.title}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    {milestone.date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {milestone.start_time} · {milestone.duration_minutes} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 border-t border-gray-200/50 mt-8">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-gray-200 hover:bg-gray-50">
            Close
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading || milestones.length === 0}
            className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
          >
            {isLoading ? "Saving..." : "Accept Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar, Clock, Save, X } from "lucide-react";
import type { CalendarEventType } from "@/lib/calendar-events";

export type CalendarEventForm = {
  title: string;
  description: string;
  eventType: CalendarEventType;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isPrivate: boolean;
};

export type CalendarEventFormData = CalendarEventForm & {
  id?: string;
};

type AddEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEventForm) => void;
  initialData?: CalendarEventFormData | null;
  allowPrivate?: boolean;
};

const eventTypeOptions: Array<{ value: CalendarEventType; label: string }> = [
  { value: "appointment", label: "Appointment" },
  { value: "school_event", label: "School Event" },
  { value: "travel", label: "Travel" },
  { value: "extracurricular", label: "Extracurricular" },
  { value: "study_block", label: "Study Block" },
  { value: "other", label: "Other" },
];

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function AddEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  allowPrivate = true,
}: AddEventModalProps) {
  const [form, setForm] = useState<CalendarEventForm>({
    title: "",
    description: "",
    eventType: "other",
    date: todayIso(),
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    isPrivate: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        title: initialData.title ?? "",
        description: initialData.description ?? "",
        eventType: initialData.eventType ?? "other",
        date: initialData.date ?? todayIso(),
        startTime: initialData.startTime ?? "09:00",
        endTime: initialData.endTime ?? "10:00",
        allDay: initialData.allDay ?? false,
        isPrivate: initialData.isPrivate ?? false,
      });
      return;
    }
    setForm({
      title: "",
      description: "",
      eventType: "other",
      date: todayIso(),
      startTime: "09:00",
      endTime: "10:00",
      allDay: false,
      isPrivate: false,
    });
  }, [initialData, isOpen]);

  const isEdit = useMemo(() => Boolean(initialData), [initialData]);

  const handleSave = () => {
    if (!form.title.trim() || !form.date) return;
    onSave({ ...form });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-0 shadow-2xl rounded-3xl p-8">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            {isEdit ? "Edit Event" : "Add Event"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g., Soccer Practice"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.eventType}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, eventType: val as CalendarEventType }))
              }
            >
              <SelectTrigger className="rounded-xl border-gray-200 bg-white/80">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {eventTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                min={todayIso()}
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300 cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300"
                disabled={form.allDay}
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300"
                disabled={form.allDay}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm((prev) => ({ ...prev, allDay: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                All day
              </span>
            </label>
            {allowPrivate && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPrivate: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Private event
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Add details or location"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300 min-h-[120px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 border-t border-gray-200/50 mt-8">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-gray-200 hover:bg-gray-50">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow">
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? "Save Changes" : "Save Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

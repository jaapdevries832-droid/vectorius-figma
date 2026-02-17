"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import type { EnrollmentWithCourse } from "@/lib/student-classes";

const CLASS_COLORS = [
  { id: "bg-blue-500", label: "Blue" },
  { id: "bg-green-500", label: "Green" },
  { id: "bg-purple-500", label: "Purple" },
  { id: "bg-red-500", label: "Red" },
  { id: "bg-yellow-500", label: "Yellow" },
  { id: "bg-pink-500", label: "Pink" },
  { id: "bg-indigo-500", label: "Indigo" },
  { id: "bg-teal-500", label: "Teal" },
];

export type ClassEditData = {
  teacher_name: string | null;
  teacher_email: string | null;
  color: string | null;
  semester1_grade: string | null;
  semester2_grade: string | null;
  semester3_grade: string | null;
  semester4_grade: string | null;
  current_grade: string | null;
};

type ClassEditModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: ClassEditData) => Promise<void>;
  enrollment: EnrollmentWithCourse | null;
};

export function ClassEditModal({
  open,
  onClose,
  onSave,
  enrollment,
}: ClassEditModalProps) {
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [semester1, setSemester1] = useState("");
  const [semester2, setSemester2] = useState("");
  const [semester3, setSemester3] = useState("");
  const [semester4, setSemester4] = useState("");
  const [currentGrade, setCurrentGrade] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && enrollment) {
      setTeacherName(enrollment.course?.teacher_name ?? "");
      setTeacherEmail(enrollment.course?.teacher_email ?? "");
      setColor(enrollment.color);
      setSemester1(enrollment.semester1_grade ?? "");
      setSemester2(enrollment.semester2_grade ?? "");
      setSemester3(enrollment.semester3_grade ?? "");
      setSemester4(enrollment.semester4_grade ?? "");
      setCurrentGrade(enrollment.current_grade ?? "");
    }
  }, [open, enrollment]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        teacher_name: teacherName.trim() || null,
        teacher_email: teacherEmail.trim() || null,
        color,
        semester1_grade: semester1.trim() || null,
        semester2_grade: semester2.trim() || null,
        semester3_grade: semester3.trim() || null,
        semester4_grade: semester4.trim() || null,
        current_grade: currentGrade.trim() || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const courseTitle = enrollment?.course?.title ?? "Class";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {courseTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Teacher Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Teacher Info</h4>
            <div className="space-y-2">
              <Label htmlFor="teacher-name" className="text-xs">Name</Label>
              <Input
                id="teacher-name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g. Mrs. Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-email" className="text-xs">Email</Label>
              <Input
                id="teacher-email"
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="e.g. smith@school.edu"
              />
            </div>
          </div>

          {/* Card Color */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Card Color</h4>
            <div className="flex flex-wrap gap-2">
              {CLASS_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    c.id,
                    color === c.id
                      ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                      : "hover:scale-105 opacity-70 hover:opacity-100"
                  )}
                />
              ))}
              {color && (
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 ml-1 self-center"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Grades */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Grades</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sem1" className="text-xs">Semester 1</Label>
                <Input
                  id="sem1"
                  value={semester1}
                  onChange={(e) => setSemester1(e.target.value)}
                  placeholder="e.g. A+"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sem2" className="text-xs">Semester 2</Label>
                <Input
                  id="sem2"
                  value={semester2}
                  onChange={(e) => setSemester2(e.target.value)}
                  placeholder="e.g. B"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sem3" className="text-xs">Semester 3</Label>
                <Input
                  id="sem3"
                  value={semester3}
                  onChange={(e) => setSemester3(e.target.value)}
                  placeholder="e.g. A-"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sem4" className="text-xs">Semester 4</Label>
                <Input
                  id="sem4"
                  value={semester4}
                  onChange={(e) => setSemester4(e.target.value)}
                  placeholder="e.g. B+"
                />
              </div>
            </div>
            <div className="space-y-1 pt-1">
              <Label htmlFor="current-grade" className="text-xs">Current Grade</Label>
              <Input
                id="current-grade"
                value={currentGrade}
                onChange={(e) => setCurrentGrade(e.target.value)}
                placeholder="e.g. 92% or A"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

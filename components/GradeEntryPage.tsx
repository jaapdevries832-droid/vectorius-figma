"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { GraduationCap, Plus, Trash2, Archive, RotateCcw } from "lucide-react";
import { cn } from "./ui/utils";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";

type GradingPeriod = {
  id: string;
  name: string;
  period_type: string;
};

type SemesterGrade = {
  id: string;
  student_id: string;
  course_id: string | null;
  grading_period_id: string;
  course_name_override: string | null;
  grade_letter: string | null;
  grade_percent: number | null;
  notes: string | null;
  created_at: string;
};

type EnrolledCourse = {
  course_id: string;
  title: string;
  archived_at: string | null;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
};

const GRADE_LETTERS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

export function GradeEntryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [gradingPeriods, setGradingPeriods] = useState<GradingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [grades, setGrades] = useState<SemesterGrade[]>([]);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add grade form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourseId, setNewCourseId] = useState<string>("custom");
  const [newCourseName, setNewCourseName] = useState("");
  const [newGradeLetter, setNewGradeLetter] = useState("");
  const [newGradePercent, setNewGradePercent] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchStudents = useCallback(async (parentId: string) => {
    const { data } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });
    setStudents(data ?? []);
    if (data && data.length > 0 && !selectedStudentId) {
      setSelectedStudentId(data[0].id);
    }
  }, [selectedStudentId]);

  const fetchGradingPeriods = useCallback(async () => {
    const { data } = await supabase
      .from("grading_periods")
      .select("id, name, period_type")
      .order("start_date", { ascending: false });
    setGradingPeriods(data ?? []);
    if (data && data.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(data[0].id);
    }
  }, [selectedPeriodId]);

  const fetchGrades = useCallback(async () => {
    if (!selectedStudentId || !selectedPeriodId) {
      setGrades([]);
      return;
    }
    const { data } = await supabase
      .from("semester_grades")
      .select("id, student_id, course_id, grading_period_id, course_name_override, grade_letter, grade_percent, notes, created_at")
      .eq("student_id", selectedStudentId)
      .eq("grading_period_id", selectedPeriodId)
      .order("created_at", { ascending: true });
    setGrades(data ?? []);
  }, [selectedStudentId, selectedPeriodId]);

  const fetchCourses = useCallback(async () => {
    if (!selectedStudentId) {
      setCourses([]);
      return;
    }
    const { data } = await supabase
      .from("student_course_enrollments")
      .select("course_id, courses(id, title, archived_at)")
      .eq("student_id", selectedStudentId);

    const mapped: EnrolledCourse[] = (data ?? []).map((e) => {
      const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
      return {
        course_id: course?.id ?? e.course_id,
        title: course?.title ?? "Unknown",
        archived_at: course?.archived_at ?? null,
      };
    });
    setCourses(mapped);
  }, [selectedStudentId]);

  useEffect(() => {
    const load = async () => {
      const { user } = await getCurrentProfile();
      if (!user) { setIsLoading(false); return; }
      setUserId(user.id);
      await fetchStudents(user.id);
      await fetchGradingPeriods();
      setIsLoading(false);
    };
    load();
  }, [fetchStudents, fetchGradingPeriods]);

  useEffect(() => {
    fetchGrades();
    fetchCourses();
  }, [fetchGrades, fetchCourses]);

  const handleAddGrade = async () => {
    if (!userId || !selectedStudentId || !selectedPeriodId) return;
    if (!newGradeLetter && !newGradePercent) {
      toast.error("Enter a grade letter or percentage.");
      return;
    }
    const courseName = newCourseId === "custom" ? newCourseName.trim() : null;
    if (newCourseId === "custom" && !courseName) {
      toast.error("Enter a course name.");
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("semester_grades")
      .insert({
        student_id: selectedStudentId,
        grading_period_id: selectedPeriodId,
        course_id: newCourseId === "custom" ? null : newCourseId,
        course_name_override: courseName,
        grade_letter: newGradeLetter || null,
        grade_percent: newGradePercent ? parseFloat(newGradePercent) : null,
        notes: newNotes.trim() || null,
        entered_by: userId,
      })
      .select("id, student_id, course_id, grading_period_id, course_name_override, grade_letter, grade_percent, notes, created_at")
      .single();

    if (error) {
      toast.error("Error saving grade: " + error.message);
      setIsSaving(false);
      return;
    }

    if (data) {
      setGrades((prev) => [...prev, data]);
      setNewCourseId("custom");
      setNewCourseName("");
      setNewGradeLetter("");
      setNewGradePercent("");
      setNewNotes("");
      setShowAddForm(false);
      toast.success("Grade added.");
    }
    setIsSaving(false);
  };

  const handleDeleteGrade = async (gradeId: string) => {
    const { error } = await supabase.from("semester_grades").delete().eq("id", gradeId);
    if (error) {
      toast.error("Error deleting grade.");
      return;
    }
    setGrades((prev) => prev.filter((g) => g.id !== gradeId));
    toast.success("Grade removed.");
  };

  const handleArchiveCourse = async (courseId: string) => {
    const { error } = await supabase
      .from("courses")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", courseId);
    if (error) {
      toast.error("Error archiving class.");
      return;
    }
    await fetchCourses();
    toast.success("Class archived.");
  };

  const handleRestoreCourse = async (courseId: string) => {
    const { error } = await supabase
      .from("courses")
      .update({ archived_at: null })
      .eq("id", courseId);
    if (error) {
      toast.error("Error restoring class.");
      return;
    }
    await fetchCourses();
    toast.success("Class restored.");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading grades...</p>
      </div>
    );
  }

  const activeCourses = courses.filter((c) => !c.archived_at);
  const archivedCourses = courses.filter((c) => c.archived_at);

  const getCourseName = (grade: SemesterGrade) => {
    if (grade.course_name_override) return grade.course_name_override;
    const course = courses.find((c) => c.course_id === grade.course_id);
    return course?.title ?? "Unknown Course";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Semester Grades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selectors */}
          <div className="flex flex-wrap items-center gap-4">
            {students.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Student:</span>
                <Select value={selectedStudentId ?? ""} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="w-44 text-sm">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Period:</span>
              <Select value={selectedPeriodId ?? ""} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {gradingPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grades table */}
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No grades entered for this period yet.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Course</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Letter</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">%</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Notes</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grades.map((g) => (
                    <tr key={g.id}>
                      <td className="px-3 py-2 text-gray-900">{getCourseName(g)}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "font-medium",
                          g.grade_letter?.startsWith("A") ? "text-emerald-700" :
                          g.grade_letter?.startsWith("B") ? "text-blue-700" :
                          g.grade_letter?.startsWith("C") ? "text-amber-700" :
                          "text-red-700"
                        )}>
                          {g.grade_letter ?? "--"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {g.grade_percent !== null ? `${g.grade_percent}%` : "--"}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">
                        {g.notes ?? ""}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDeleteGrade(g.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete grade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add grade form */}
          {showAddForm ? (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                  <Select value={newCourseId} onValueChange={setNewCourseId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom course name</SelectItem>
                      {activeCourses.map((c) => (
                        <SelectItem key={c.course_id} value={c.course_id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newCourseId === "custom" && (
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g. Algebra II"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Letter Grade</label>
                    <Select value={newGradeLetter} onValueChange={setNewGradeLetter}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LETTERS.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Percent</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newGradePercent}
                      onChange={(e) => setNewGradePercent(e.target.value)}
                      placeholder="95"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Great improvement"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleAddGrade} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSaving ? "Saving..." : "Save Grade"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Grade
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Class archiving */}
      {selectedStudentId && (activeCourses.length > 0 || archivedCourses.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCourses.map((c) => (
              <div key={c.course_id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span className="text-gray-900">{c.title}</span>
                <button
                  onClick={() => handleArchiveCourse(c.course_id)}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  title="Archive class"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              </div>
            ))}
            {archivedCourses.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Archived ({archivedCourses.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {archivedCourses.map((c) => (
                    <div key={c.course_id} className="flex items-center justify-between rounded-lg border border-dashed p-2.5 text-sm text-gray-500">
                      <span>{c.title}</span>
                      <button
                        onClick={() => handleRestoreCourse(c.course_id)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        title="Restore class"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

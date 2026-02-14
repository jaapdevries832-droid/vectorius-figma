"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ParentDashboard, type SignalCardType } from "@/components/ParentDashboard";
import { useRoleLayout } from "@/lib/role-layout-context";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  advisor_id: string | null;
  student_user_id: string | null;
};

type ParentSignal = {
  parent_id: string;
  student_id: string;
  student_name: string;
  overdue_count: number;
  next_big_item: {
    title: string;
    due_at: string;
    type: string;
  } | null;
  has_active_plan: boolean;
  pending_suggestions: number;
};

type StudentClass = {
  course_id: string;
  title: string;
  teacher_name: string | null;
  grade_avg: number | null;
};

type AdvisorNote = {
  id: string;
  advisor_id: string;
  student_id: string;
  message: string;
  priority: string;
  created_at: string;
  advisor_first_name?: string | null;
  advisor_last_name?: string | null;
  advisor_email?: string | null;
  advisor?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

export function ParentDashboardWrapper() {
  const { setActiveItem } = useRoleLayout();
  const [userId, setUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [pendingDeleteStudentId, setPendingDeleteStudentId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [gradeMetricsByStudentId, setGradeMetricsByStudentId] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [studentSignals, setStudentSignals] = useState<ParentSignal[]>([]);
  const [advisorNotes, setAdvisorNotes] = useState<AdvisorNote[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);

  const fetchGradeMetrics = useCallback(async (studentIds: string[]) => {
    if (studentIds.length === 0) {
      setGradeMetricsByStudentId({});
      return;
    }

    const { data, error } = await supabase
      .from("assignments")
      .select("student_id, score, max_score")
      .in("student_id", studentIds);

    if (error) {
      setGradeMetricsByStudentId({});
      return;
    }

    const totals: Record<string, { score: number; max: number }> = {};
    studentIds.forEach((id) => {
      totals[id] = { score: 0, max: 0 };
    });

    (data ?? []).forEach((row) => {
      if (row.max_score === null) return;
      const entry = totals[row.student_id] ?? { score: 0, max: 0 };
      entry.score += row.score ?? 0;
      entry.max += row.max_score ?? 0;
      totals[row.student_id] = entry;
    });

    const metrics: Record<string, number | null> = {};
    Object.entries(totals).forEach(([id, entry]) => {
      metrics[id] = entry.max > 0 ? entry.score / entry.max : null;
    });

    setGradeMetricsByStudentId(metrics);
  }, []);

  const fetchStudents = useCallback(async (parentUserId?: string | null) => {
    const parentId = parentUserId ?? userId;
    if (!parentId) {
      setStudents([]);
      return;
    }

    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, grade, advisor_id, student_user_id, created_at")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });

    if (error) {
      return;
    }

    const nextStudents = data ?? [];
    setStudents(nextStudents);
    setSelectedStudentId((current) => {
      if (!nextStudents.length) return null;
      if (!current) return nextStudents[0].id;
      return nextStudents.some((student) => student.id === current) ? current : nextStudents[0].id;
    });
    await fetchGradeMetrics(nextStudents.map((student) => student.id));
  }, [fetchGradeMetrics, userId]);

  const fetchStudentSignals = useCallback(async () => {
    const { data, error } = await supabase
      .from("parent_student_signals")
      .select("*");

    if (error) {
      setStudentSignals([]);
      return;
    }

    setStudentSignals(data ?? []);
  }, []);

  const fetchAdvisorNotes = useCallback(async (studentId: string | null) => {
    if (!studentId) {
      setAdvisorNotes([]);
      return;
    }

    const { data, error } = await supabase
      .from("advisor_notes_with_profiles")
      .select(
        "id, advisor_id, student_id, message, priority, created_at, advisor_first_name, advisor_last_name, advisor_email"
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      setAdvisorNotes([]);
      return;
    }

    const notesWithAdvisors = (data ?? []).map((note) => ({
      ...note,
      advisor: note.advisor_email
        ? {
            first_name: note.advisor_first_name ?? null,
            last_name: note.advisor_last_name ?? null,
            email: note.advisor_email,
          }
        : null,
    }));

    setAdvisorNotes(notesWithAdvisors);
  }, []);

  const fetchStudentClasses = useCallback(async (studentId: string | null) => {
    if (!studentId) {
      setStudentClasses([]);
      return;
    }

    // Fetch enrolled courses
    const { data: enrollments, error: enrollErr } = await supabase
      .from("student_course_enrollments")
      .select("course_id, courses(id, title, teacher_name)")
      .eq("student_id", studentId);

    if (enrollErr || !enrollments) {
      setStudentClasses([]);
      return;
    }

    // Fetch assignments for grade averages
    const { data: assignments } = await supabase
      .from("assignments")
      .select("course_id, score, max_score")
      .eq("student_id", studentId);

    // Calculate per-course averages
    const courseGrades: Record<string, { score: number; max: number }> = {};
    (assignments ?? []).forEach((a) => {
      if (a.course_id && a.max_score !== null) {
        const entry = courseGrades[a.course_id] ?? { score: 0, max: 0 };
        entry.score += a.score ?? 0;
        entry.max += a.max_score ?? 0;
        courseGrades[a.course_id] = entry;
      }
    });

    const classes: StudentClass[] = enrollments.map((e) => {
      const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
      const courseId = course?.id ?? e.course_id;
      const gradeEntry = courseGrades[courseId];
      const gradeAvg = gradeEntry && gradeEntry.max > 0
        ? (gradeEntry.score / gradeEntry.max) * 100
        : null;
      return {
        course_id: courseId,
        title: course?.title ?? "Unknown Course",
        teacher_name: course?.teacher_name ?? null,
        grade_avg: gradeAvg,
      };
    });

    setStudentClasses(classes);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { user, profile } = await getCurrentProfile();

      if (!isMounted) return;

      if (!user) {
        setAuthMessage("Please sign in");
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setAuthMessage(null);
      setUserId(user.id);

      await fetchStudents(user.id);
      if (profile?.role === "parent") {
        await fetchStudentSignals();
      }
      setIsLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [fetchStudents, fetchStudentSignals]);

  useEffect(() => {
    fetchAdvisorNotes(selectedStudentId);
    fetchStudentClasses(selectedStudentId);
  }, [selectedStudentId, fetchAdvisorNotes, fetchStudentClasses]);

  const handleDeleteStudent = (studentId: string) => {
    setPendingDeleteStudentId(studentId);
  };

  const confirmDeleteStudent = async () => {
    if (!pendingDeleteStudentId) return;
    setDeleteStatus(null);
    setDeletingStudentId(pendingDeleteStudentId);

    const { error } = await supabase.from("students").delete().eq("id", pendingDeleteStudentId);

    if (error) {
      setDeleteStatus({ type: "error", message: error.message });
      setDeletingStudentId(null);
      return;
    }

    await fetchStudents(userId);
    setDeleteStatus({ type: "success", message: "Student deleted." });
    toast.success("Student has been deleted.");
    setPendingDeleteStudentId(null);
    setDeletingStudentId(null);
  };

  const handleSignalCardClick = (cardType: SignalCardType) => {
    if (!selectedStudentId) return;

    switch (cardType) {
      case "overdue":
        setActiveItem("assignments");
        toast.info("Viewing assignments - check for overdue items");
        break;
      case "upcoming":
        setActiveItem("schedule");
        toast.info("Viewing schedule for upcoming tests and projects");
        break;
      case "plan":
        setActiveItem("schedule");
        toast.info("Viewing study plan schedule");
        break;
      case "suggestions":
        setActiveItem("assignments");
        toast.info("Viewing assignments - check pending suggestions");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (authMessage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{authMessage}</p>
      </div>
    );
  }

  return (
    <>
      <ParentDashboard
        students={students}
        selectedStudentId={selectedStudentId}
        onSelectStudent={setSelectedStudentId}
        deletingStudentId={deletingStudentId}
        deleteStatus={deleteStatus}
        onDeleteStudent={handleDeleteStudent}
        gradeMetricsByStudentId={gradeMetricsByStudentId}
        studentSignals={studentSignals}
        advisorNotes={advisorNotes}
        studentClasses={studentClasses}
        onSignalCardClick={handleSignalCardClick}
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteStudentId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteStudentId(null);
        }}
        title="Delete this student?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          void confirmDeleteStudent();
        }}
      />
    </>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ParentDashboard } from "@/components/ParentDashboard";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  advisor_id: string | null;
};

type AdvisorOption = {
  id: string;
  label: string;
};

type AssignmentStatus = {
  type: "success" | "error";
  message: string;
};

type StudentOverview = {
  parent_id: string;
  student_id: string;
  student_name: string;
  upcoming_assignments_count: number;
  completed_assignments_count: number;
  overdue_assignments_count: number;
  next_due_at: string | null;
  last_activity_at: string | null;
};

type AdvisorNote = {
  id: string;
  advisor_id: string;
  student_id: string;
  message: string;
  priority: string;
  created_at: string;
  advisor?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

export function ParentDashboardWrapper() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);
  const [advisorLoadError, setAdvisorLoadError] = useState<string | null>(null);
  const [isAdvisorsLoading, setIsAdvisorsLoading] = useState(false);
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [assignmentStatusByStudentId, setAssignmentStatusByStudentId] = useState<
    Record<string, AssignmentStatus | null>
  >({});
  const [gradeMetricsByStudentId, setGradeMetricsByStudentId] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [studentOverviews, setStudentOverviews] = useState<StudentOverview[]>([]);
  const [advisorNotes, setAdvisorNotes] = useState<AdvisorNote[]>([]);

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

  const fetchStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, grade, advisor_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      return;
    }

    setLoadError(null);
    const nextStudents = data ?? [];
    setStudents(nextStudents);
    setSelectedStudentId((current) => {
      if (!nextStudents.length) return null;
      if (!current) return nextStudents[0].id;
      return nextStudents.some((student) => student.id === current) ? current : nextStudents[0].id;
    });
    await fetchGradeMetrics(nextStudents.map((student) => student.id));
  }, [fetchGradeMetrics]);

  const fetchAdvisors = useCallback(async () => {
    setIsAdvisorsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "advisor")
      .order("last_name", { ascending: true });

    if (error) {
      setAdvisorLoadError(error.message);
      setAdvisors([]);
      setIsAdvisorsLoading(false);
      return;
    }

    const nextAdvisors = (data ?? []).map((advisor) => {
      const name = `${advisor.first_name ?? ""} ${advisor.last_name ?? ""}`.trim();
      const label = name || advisor.email || "Advisor";
      return { id: advisor.id, label };
    });

    setAdvisorLoadError(null);
    setAdvisors(nextAdvisors);
    setIsAdvisorsLoading(false);
  }, []);

  const fetchStudentOverviews = useCallback(async () => {
    const { data, error } = await supabase
      .from("parent_student_overview")
      .select("*");

    if (error) {
      setStudentOverviews([]);
      return;
    }

    setStudentOverviews(data ?? []);
  }, []);

  const fetchAdvisorNotes = useCallback(async (studentId: string | null) => {
    if (!studentId) {
      setAdvisorNotes([]);
      return;
    }

    const { data, error } = await supabase
      .from("advisor_notes")
      .select(`
        id,
        advisor_id,
        student_id,
        message,
        priority,
        created_at
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      setAdvisorNotes([]);
      return;
    }

    const notesWithAdvisors = await Promise.all(
      (data ?? []).map(async (note) => {
        const { data: advisorData } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", note.advisor_id)
          .single();

        return {
          ...note,
          advisor: advisorData || null
        };
      })
    );

    setAdvisorNotes(notesWithAdvisors);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { user, profile } = await getCurrentProfile();

      if (!isMounted) return;

      if (!user) {
        setAuthMessage("Please sign in");
        setProfileRole(null);
        setEmail(null);
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setAuthMessage(null);
      setEmail(user.email ?? "Unknown");
      setUserId(user.id);
      setProfileRole(profile?.role ?? null);

      await fetchStudents();
      if (profile?.role === "parent") {
        await fetchAdvisors();
        await fetchStudentOverviews();
      }
      setIsLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [fetchAdvisors, fetchStudents, fetchStudentOverviews, router]);

  useEffect(() => {
    fetchAdvisorNotes(selectedStudentId);
  }, [selectedStudentId, fetchAdvisorNotes]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedGrade = grade.trim();

    if (!trimmedFirst) {
      setFormError("First name is required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setDeleteStatus(null);

    const { error } = await supabase
      .from("students")
      .insert({
        parent_id: userId,
        first_name: trimmedFirst,
        last_name: trimmedLast || null,
        grade: trimmedGrade || null,
      });

    if (error) {
      if (error.code === "23505" && error.message.includes("students_unique_per_parent")) {
        setFormError("That student already exists.");
      } else {
        setFormError(error.message);
      }
      setIsSaving(false);
      return;
    }

    setFirstName("");
    setLastName("");
    setGrade("");
    await fetchStudents();
    toast.success(`${trimmedFirst} has been added successfully.`);

    setIsSaving(false);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Delete this student?")) return;
    setDeleteStatus(null);
    setDeletingStudentId(studentId);

    const { error } = await supabase.from("students").delete().eq("id", studentId);

    if (error) {
      setDeleteStatus({ type: "error", message: error.message });
      setDeletingStudentId(null);
      return;
    }

    await fetchStudents();
    setDeleteStatus({ type: "success", message: "Student deleted." });
    toast.success("Student has been deleted.");
    setDeletingStudentId(null);
  };

  const handleAssignAdvisor = async (studentId: string, advisorId: string | null) => {
    setAssigningStudentId(studentId);
    setAssignmentStatusByStudentId((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });

    const { error } = await supabase
      .from("students")
      .update({ advisor_id: advisorId })
      .eq("id", studentId);

    if (error) {
      setAssignmentStatusByStudentId((current) => ({
        ...current,
        [studentId]: { type: "error", message: error.message },
      }));
      setAssigningStudentId(null);
      return;
    }

    await fetchStudents();
    setAssignmentStatusByStudentId((current) => ({
      ...current,
      [studentId]: {
        type: "success",
        message: advisorId ? "Advisor assigned." : "Advisor cleared.",
      },
    }));
    toast.success(advisorId ? "Advisor has been assigned." : "Advisor has been cleared.");
    setAssigningStudentId(null);
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
    <ParentDashboard
      email={email}
      students={students}
      selectedStudentId={selectedStudentId}
      onSelectStudent={setSelectedStudentId}
      firstName={firstName}
      lastName={lastName}
      grade={grade}
      onFirstNameChange={setFirstName}
      onLastNameChange={setLastName}
      onGradeChange={setGrade}
      onAddStudent={handleAddStudent}
      isSaving={isSaving}
      deletingStudentId={deletingStudentId}
      formError={formError}
      loadError={loadError}
      deleteStatus={deleteStatus}
      onDeleteStudent={handleDeleteStudent}
      advisors={advisors}
      showAdvisorAssignments={profileRole === "parent"}
      advisorLoadError={advisorLoadError}
      isAdvisorsLoading={isAdvisorsLoading}
      assigningStudentId={assigningStudentId}
      assignmentStatusByStudentId={assignmentStatusByStudentId}
      onAssignAdvisor={handleAssignAdvisor}
      onSignOut={handleSignOut}
      gradeMetricsByStudentId={gradeMetricsByStudentId}
      studentOverviews={studentOverviews}
      advisorNotes={advisorNotes}
    />
  );
}

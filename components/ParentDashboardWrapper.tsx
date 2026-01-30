"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ParentDashboard, type SignalCardType } from "@/components/ParentDashboard";
import { useRoleLayout } from "app/lib/role-layout-context";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";
import { InviteCodeModal } from "@/components/InviteCodeModal";
import { clearSupabaseLocalSession } from "@/lib/supabase/logout";
import { AssignmentModal, type AssignmentInput } from "@/components/AssignmentModal";
import { validateName, validateGrade } from "@/lib/validation";
import type { ScheduledCourse } from "app/lib/domain";
import { fetchStudentScheduleEvents, mapScheduleEventsToCourses } from "@/lib/student-schedule";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  advisor_id: string | null;
  student_user_id: string | null;
};

type AdvisorOption = {
  id: string;
  label: string;
};

type AssignmentStatus = {
  type: "success" | "error";
  message: string;
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
  const { setActiveItem } = useRoleLayout();
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
  const [studentSignals, setStudentSignals] = useState<ParentSignal[]>([]);
  const [advisorNotes, setAdvisorNotes] = useState<AdvisorNote[]>([]);
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestClasses, setSuggestClasses] = useState<ScheduledCourse[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

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
      .select("id, first_name, last_name, grade, advisor_id, student_user_id, created_at")
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
        await fetchStudentSignals();
      }
      setIsLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [fetchAdvisors, fetchStudents, fetchStudentSignals, router]);

  useEffect(() => {
    fetchAdvisorNotes(selectedStudentId);
  }, [selectedStudentId, fetchAdvisorNotes]);

  const handleSignOut = async () => {
    setIsLoading(true);
    // Clear all auth state in the correct order
    // 1. Sign out from Supabase first (this invalidates the session)
    await supabase.auth.signOut({ scope: "local" });

    // 2. Clear server-side cookies via API
    await fetch("/api/auth/logout", { method: "POST" });

    // 3. Clear all local storage auth data
    clearSupabaseLocalSession();

    // 4. Use window.location for a hard redirect to ensure all state is cleared
    window.location.href = "/login";
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedGrade = grade.trim();

    // Validate first name
    const firstNameValidation = validateName(trimmedFirst, "First name");
    if (!firstNameValidation.valid) {
      setFormError(firstNameValidation.error ?? "Invalid first name");
      return;
    }

    // Validate grade selection
    const gradeValidation = validateGrade(trimmedGrade);
    if (!gradeValidation.valid) {
      setFormError(gradeValidation.error ?? "Please select a grade");
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

  const handleOpenInvite = (student: Student) => {
    setInviteStudent(student);
    setInviteCode(null);
    setInviteExpiresAt(null);
    setInviteError(null);
    setInviteEmail("");
    setIsInviteOpen(true);
  };

  const handleOpenSuggestModal = async () => {
    if (!selectedStudentId) return;
    setIsSuggestLoading(true);
    const { data, error } = await fetchStudentScheduleEvents(selectedStudentId);
    if (error) {
      toast.error("Unable to load classes for that student.");
      setIsSuggestLoading(false);
      return;
    }
    setSuggestClasses(mapScheduleEventsToCourses(data));
    setIsSuggestLoading(false);
    setIsSuggestModalOpen(true);
  };

  const handleSaveSuggestion = async (assignment: AssignmentInput) => {
    if (!selectedStudentId) return;
    const { user, profile } = await getCurrentProfile();
    if (!user) {
      toast.error("Please sign in to suggest assignments.");
      return;
    }

    const { error } = await supabase.from("assignments").insert({
      student_id: selectedStudentId,
      course_id: assignment.classId === "none" ? null : assignment.classId,
      type: assignment.type,
      title: assignment.title,
      due_at: assignment.dueDate ? new Date(assignment.dueDate).toISOString() : null,
      description: assignment.notes || null,
      status: "not_started",
      created_by: profile?.id ?? user.id,
      created_by_role: profile?.role ?? "parent",
      source: "parent",
      is_suggested: true,
      suggestion_status: "pending",
    });

    if (error) {
      toast.error(`Error creating suggestion: ${error.message}`);
      return;
    }

    setIsSuggestModalOpen(false);
    toast.success(`Suggested "${assignment.title}" to the student.`);
    await fetchStudentSignals();
  };

  const handleGenerateInvite = async () => {
    if (!inviteStudent || !userId) return;
    setIsInviteLoading(true);
    setInviteError(null);

    let created = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateInviteCode();
      const { data, error } = await supabase
        .from("student_invites")
        .insert({
          parent_id: userId,
          student_id: inviteStudent.id,
          invite_code: code,
        })
        .select("invite_code, expires_at")
        .single();

      if (!error && data) {
        setInviteCode(data.invite_code);
        setInviteExpiresAt(data.expires_at);
        toast.success("Invite code created.");
        created = true;
        break;
      }

      if (!error?.code || error.code !== "23505") {
        setInviteError(error?.message ?? "Unable to generate invite code.");
        break;
      }
    }

    if (!created && !inviteError) {
      setInviteError("Unable to generate a unique invite code. Please try again.");
    }
    setIsInviteLoading(false);
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteCode);
      toast.success("Invite code copied.");
      return;
    }
    toast.error("Clipboard not available.");
  };

  const handleSignalCardClick = (cardType: SignalCardType) => {
    if (!selectedStudentId) return;

    switch (cardType) {
      case "overdue":
        // Navigate to assignments page - shows overdue items
        setActiveItem("assignments");
        toast.info("Viewing assignments - check for overdue items");
        break;
      case "upcoming":
        // Navigate to schedule to see upcoming tests/projects
        setActiveItem("schedule");
        toast.info("Viewing schedule for upcoming tests and projects");
        break;
      case "plan":
        // Navigate to schedule to see study plan
        setActiveItem("schedule");
        toast.info("Viewing study plan schedule");
        break;
      case "suggestions":
        // Navigate to assignments to see pending suggestions
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
        studentSignals={studentSignals}
        advisorNotes={advisorNotes}
        onInviteStudent={handleOpenInvite}
        onSuggestAssignment={handleOpenSuggestModal}
        onSignalCardClick={handleSignalCardClick}
      />
      {inviteStudent && (
        <InviteCodeModal
          open={isInviteOpen}
          studentName={`${inviteStudent.first_name} ${inviteStudent.last_name ?? ""}`.trim()}
          inviteCode={inviteCode}
          expiresAt={inviteExpiresAt}
          isLoading={isInviteLoading}
          error={inviteError}
          email={inviteEmail}
          onEmailChange={setInviteEmail}
          onGenerate={handleGenerateInvite}
          onCopy={handleCopyInvite}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
      <AssignmentModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        onSave={handleSaveSuggestion}
        classes={suggestClasses}
      />
      {isSuggestLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-white px-4 py-2 text-sm shadow">Loading classes...</div>
        </div>
      )}
    </>
  );
}

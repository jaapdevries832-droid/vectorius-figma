"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ParentDashboard } from "@/components/ParentDashboard";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
};

export default function ParentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, grade, created_at")
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
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? "Unknown");
      setUserId(data.user.id);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: data.user.id }, { onConflict: "id" });

      if (profileError) {
        setLoadError(profileError.message);
      }

      await fetchStudents();
      setIsLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [fetchStudents, router]);

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
      setFormError(error.message);
      setIsSaving(false);
      return;
    }

    setFirstName("");
    setLastName("");
    setGrade("");
    await fetchStudents();

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
    setDeletingStudentId(null);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh]">
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
        onSignOut={handleSignOut}
      />
    </main>
  );
}

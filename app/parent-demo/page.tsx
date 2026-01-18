"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ParentDashboard } from "@/components/ParentDashboard";

type Student = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  advisor_id: string | null;
  student_user_id: string | null;
};

const seededStudents: Student[] = [
  { id: "1", first_name: "Jordan", last_name: "Davis", grade: "10", advisor_id: null, student_user_id: null },
  { id: "2", first_name: "Avery", last_name: "Davis", grade: "7", advisor_id: null, student_user_id: null },
  { id: "5", first_name: "Annie", last_name: "de Vries", grade: "9", advisor_id: null, student_user_id: null },
];

const createStudentId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now());
};

export default function ParentDemoPage() {
  const router = useRouter();
  const [hasEnteredDemo, setHasEnteredDemo] = useState(false);
  const [email] = useState<string>("Demo Parent (no sign-in)");

  const [students, setStudents] = useState<Student[]>(seededStudents);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(seededStudents[0]?.id ?? null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    const nextStudent: Student = {
      id: createStudentId(),
      first_name: trimmedFirst,
      last_name: trimmedLast || null,
      grade: trimmedGrade || null,
      advisor_id: null,
      student_user_id: null,
    };

    setStudents((current) => [nextStudent, ...current]);
    setSelectedStudentId(nextStudent.id);
    setFirstName("");
    setLastName("");
    setGrade("");
    setIsSaving(false);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Delete this student?")) return;
    setDeleteStatus(null);
    setDeletingStudentId(studentId);

    const remaining = students.filter((student) => student.id !== studentId);
    setStudents(remaining);
    setSelectedStudentId((currentId) => {
      if (currentId !== studentId) return currentId;
      return remaining[0]?.id ?? null;
    });

    setDeleteStatus({ type: "success", message: "Student deleted (demo only)." });
    setDeletingStudentId(null);
  };

  const handleSignOut = () => {
    setHasEnteredDemo(false);
    router.push("/login");
  };

  if (!hasEnteredDemo) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-6 text-center shadow">
          <h1 className="text-2xl font-semibold">Parent Dashboard Demo</h1>
          <p className="text-sm text-muted-foreground">
            No sign-in required. Click the button to open a demo copy of the parent dashboard UI.
          </p>
          <button
            type="button"
            onClick={() => setHasEnteredDemo(true)}
            className="w-full rounded-lg border-2 border-primary bg-primary px-3 py-3 text-sm font-semibold text-white"
          >
            Enter Demo Parent Dashboard
          </button>
          <p className="text-xs text-muted-foreground">
            Demo only: changes are not saved to Supabase.
          </p>
        </div>
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

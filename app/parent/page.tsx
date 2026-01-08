"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    setStudents(data ?? []);
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

  if (isLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Signed in as {email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </div>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Add student</h2>
          <form onSubmit={handleAddStudent} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="text-sm font-medium text-gray-700">
                  First name
                </label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="last-name" className="text-sm font-medium text-gray-700">
                  Last name
                </label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="grade" className="text-sm font-medium text-gray-700">
                  Grade
                </label>
                <input
                  id="grade"
                  type="text"
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Add student"}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Your students</h2>
          {students.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No students yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {students.map((student) => (
                <li key={student.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="font-medium text-gray-900">
                    {student.first_name} {student.last_name ?? ""}
                  </div>
                  {student.grade && (
                    <div className="text-xs text-gray-600">Grade: {student.grade}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

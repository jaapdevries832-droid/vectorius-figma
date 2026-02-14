"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { CheckCircle2, UserPlus, Users, Mail } from "lucide-react";
import { cn } from "./ui/utils";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";
import { InviteCodeModal } from "./InviteCodeModal";
import { validateName, validateGrade } from "@/lib/validation";

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

const GRADE_OPTIONS = [
  "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
];

export function ParentSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add student form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Advisors
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [assignmentStatusByStudentId, setAssignmentStatusByStudentId] = useState<
    Record<string, AssignmentStatus | null>
  >({});

  // Invite
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const fetchStudents = useCallback(async (parentUserId: string) => {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, grade, advisor_id, student_user_id, created_at")
      .eq("parent_id", parentUserId)
      .order("created_at", { ascending: false });

    if (error) return;
    setStudents(data ?? []);
  }, []);

  const fetchAdvisors = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "advisor")
      .order("last_name", { ascending: true });

    if (error) {
      setAdvisors([]);
      return;
    }

    const nextAdvisors = (data ?? []).map((advisor) => {
      const name = `${advisor.first_name ?? ""} ${advisor.last_name ?? ""}`.trim();
      const label = name || advisor.email || "Advisor";
      return { id: advisor.id, label };
    });

    setAdvisors(nextAdvisors);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { user } = await getCurrentProfile();
      if (!isMounted) return;

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);
      await fetchStudents(user.id);
      await fetchAdvisors();
      setIsLoading(false);
    };

    load();
    return () => { isMounted = false; };
  }, [fetchStudents, fetchAdvisors]);

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedGrade = grade.trim();

    const firstNameValidation = validateName(trimmedFirst, "First name");
    if (!firstNameValidation.valid) {
      setFormError(firstNameValidation.error ?? "Invalid first name");
      return;
    }

    const gradeValidation = validateGrade(trimmedGrade);
    if (!gradeValidation.valid) {
      setFormError(gradeValidation.error ?? "Please select a grade");
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
    await fetchStudents(userId);
    toast.success(`${trimmedFirst} has been added successfully.`);
    setIsSaving(false);
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

    if (userId) await fetchStudents(userId);
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

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>

      {/* Section 1: Add Student */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Add Student
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                  Grade *
                </label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g === "K" ? "Kindergarten" : `Grade ${g}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? "Adding..." : "Add Student"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Manage Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-purple-600" />
            Manage Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students added yet.</p>
          ) : (
            <div className="space-y-4">
              {students.map((student) => {
                const initials = `${student.first_name[0] ?? ""}${student.last_name?.[0] ?? ""}`.toUpperCase();
                const displayName = `${student.first_name} ${student.last_name ?? ""}`.trim();
                const isLinked = Boolean(student.student_user_id);
                const status = assignmentStatusByStudentId[student.id];

                return (
                  <div
                    key={student.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
                            {initials || "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">{displayName}</div>
                          <div className="text-xs text-gray-500">
                            {student.grade ? `Grade ${student.grade}` : "Grade not set"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLinked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Linked
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleOpenInvite(student)}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Invite
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Advisor assignment */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 min-w-[60px]">Advisor:</span>
                      <Select
                        value={student.advisor_id ?? "none"}
                        onValueChange={(val) =>
                          handleAssignAdvisor(student.id, val === "none" ? null : val)
                        }
                        disabled={assigningStudentId === student.id}
                      >
                        <SelectTrigger className="w-full max-w-xs text-sm">
                          <SelectValue placeholder="Select advisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No advisor</SelectItem>
                          {advisors.map((adv) => (
                            <SelectItem key={adv.id} value={adv.id}>
                              {adv.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assigningStudentId === student.id && (
                        <span className="text-xs text-gray-500">Saving...</span>
                      )}
                    </div>
                    {status && (
                      <p
                        className={cn(
                          "text-xs",
                          status.type === "error" ? "text-red-600" : "text-green-600"
                        )}
                      >
                        {status.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Signed in as</span>
            <span className="text-sm font-medium text-gray-900">{email ?? "Unknown"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-700">Import School Email</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Link Gmail or Outlook to auto-ingest school notifications.
              </p>
            </div>
            <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
              Coming soon
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Invite modal */}
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
    </div>
  );
}

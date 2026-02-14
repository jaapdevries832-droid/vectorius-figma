"use client"

import { FormEvent } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { TrendingUp, Calendar, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import { cn } from "./ui/utils";

type StudentSummary = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  advisor_id: string | null;
  student_user_id: string | null;
};

type DeleteStatus = {
  type: "success" | "error";
  message: string;
} | null;

type AssignmentStatus = {
  type: "success" | "error";
  message: string;
} | null;

type AdvisorOption = {
  id: string;
  label: string;
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

export type SignalCardType = "overdue" | "upcoming" | "plan" | "suggestions";

type ParentDashboardProps = {
  email: string | null;
  students: StudentSummary[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  firstName: string;
  lastName: string;
  grade: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onAddStudent: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  deletingStudentId: string | null;
  formError: string | null;
  loadError: string | null;
  deleteStatus: DeleteStatus;
  onDeleteStudent: (id: string) => void;
  advisors?: AdvisorOption[];
  showAdvisorAssignments?: boolean;
  advisorLoadError?: string | null;
  isAdvisorsLoading?: boolean;
  assigningStudentId?: string | null;
  assignmentStatusByStudentId?: Record<string, AssignmentStatus | null>;
  onAssignAdvisor?: (studentId: string, advisorId: string | null) => void;
  onSignOut?: () => void;
  gradeMetricsByStudentId?: Record<string, number | null>;
  studentSignals?: ParentSignal[];
  advisorNotes?: AdvisorNote[];
  onInviteStudent?: (student: StudentSummary) => void;
  onSuggestAssignment?: () => void;
  onSignalCardClick?: (cardType: SignalCardType) => void;
};

export function ParentDashboard({
  email,
  students,
  selectedStudentId,
  onSelectStudent,
  firstName,
  lastName,
  grade,
  onFirstNameChange,
  onLastNameChange,
  onGradeChange,
  onAddStudent,
  isSaving,
  deletingStudentId,
  formError,
  loadError,
  deleteStatus,
  onDeleteStudent,
  advisors = [],
  showAdvisorAssignments = false,
  advisorLoadError = null,
  isAdvisorsLoading = false,
  assigningStudentId = null,
  assignmentStatusByStudentId = {},
  onAssignAdvisor,
  onSignOut,
  gradeMetricsByStudentId = {},
  studentSignals = [],
  advisorNotes = [],
  onInviteStudent,
  onSuggestAssignment,
  onSignalCardClick,
}: ParentDashboardProps) {
  const studentOptions = students.map((student) => {
    const initials = `${student.first_name[0] ?? ""}${student.last_name?.[0] ?? ""}`.toUpperCase();
    const displayName = `${student.first_name} ${student.last_name ?? ""}`.trim();
    return {
      id: student.id,
      name: displayName,
      grade: student.grade ? `Grade ${student.grade}` : "Grade not set",
      avatar: initials || "ST",
    };
  });

  const currentSignals = selectedStudentId
    ? studentSignals.find((signal) => signal.student_id === selectedStudentId)
    : undefined;
  const nextBigItem = currentSignals?.next_big_item ?? null;
  const nextBigItemDate = nextBigItem?.due_at ? new Date(nextBigItem.due_at).toLocaleDateString() : null;
  const hasPlanLabel = currentSignals?.has_active_plan ? "Active" : "No active plan";
  const suggestionCount = currentSignals?.pending_suggestions ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          {(() => {
            const selectedStudent = students.find((s) => s.id === selectedStudentId);
            if (selectedStudent) {
              const fullName = `${selectedStudent.first_name} ${selectedStudent.last_name ?? ""}`.trim();
              const gradeLabel = selectedStudent.grade ? `Grade ${selectedStudent.grade}` : "";
              return (
                <>
                  <h1 className="text-3xl font-semibold text-gray-900 mb-1">{fullName}</h1>
                  <p className="text-gray-600">{gradeLabel ? `${gradeLabel} — Overview` : "Overview"}</p>
                </>
              );
            }
            return (
              <>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Select a Student</h1>
                <p className="text-gray-600">Choose a student to view their academic progress</p>
              </>
            );
          })()}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Viewing:</span>
            <Select
              value={selectedStudentId ?? ""}
              onValueChange={onSelectStudent}
              disabled={studentOptions.length === 0}
            >
              <SelectTrigger className="w-56 min-w-[14rem] px-4 py-2 border-2 border-blue-200 bg-white shadow-sm hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
            <SelectContent className="min-w-[14rem]">
              {studentOptions.map((child) => (
                <SelectItem key={child.id} value={child.id} className="cursor-pointer py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">{child.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{child.name}</div>
                      <div className="text-xs text-gray-500">{child.grade}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      {/* Parent Signals */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card
          className={cn(
            "border-0 bg-gradient-to-br from-red-50 to-red-100 transition-all",
            currentSignals && onSignalCardClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
          )}
          onClick={() => currentSignals && onSignalCardClick?.("overdue")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">Overdue Items</p>
                <p className="text-2xl font-semibold text-red-700">
                  {currentSignals ? currentSignals.overdue_count : "--"}
                </p>
                {!currentSignals && (
                  <p className="mt-1 text-xs text-red-700">Select a student to see alerts.</p>
                )}
                {currentSignals && onSignalCardClick && (
                  <p className="mt-1 text-xs text-red-600">Click to view</p>
                )}
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-0 bg-gradient-to-br from-purple-50 to-purple-100 transition-all",
            currentSignals && onSignalCardClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
          )}
          onClick={() => currentSignals && onSignalCardClick?.("upcoming")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 mb-1">Upcoming Test/Project</p>
                <p className="text-2xl font-semibold text-purple-700">
                  {nextBigItem ? nextBigItem.title : "--"}
                </p>
                {!nextBigItem && (
                  <p className="mt-1 text-xs text-purple-600">No big items in the next 2 weeks.</p>
                )}
                {nextBigItem && nextBigItemDate && (
                  <p className="mt-1 text-xs text-purple-600">Due {nextBigItemDate}</p>
                )}
                {currentSignals && onSignalCardClick && nextBigItem && (
                  <p className="mt-1 text-xs text-purple-600 font-medium">Click to view</p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-0 bg-gradient-to-br from-blue-50 to-blue-100 transition-all",
            currentSignals && onSignalCardClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
          )}
          onClick={() => currentSignals && onSignalCardClick?.("plan")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">Study Plan</p>
                <p className="text-2xl font-semibold text-blue-700">
                  {currentSignals ? hasPlanLabel : "--"}
                </p>
                {!currentSignals && (
                  <p className="mt-1 text-xs text-blue-600">Select a student to see status.</p>
                )}
                {currentSignals && onSignalCardClick && (
                  <p className="mt-1 text-xs text-blue-600">Click to view schedule</p>
                )}
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-0 bg-gradient-to-br from-amber-50 to-amber-100 transition-all",
            currentSignals && onSignalCardClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
          )}
          onClick={() => currentSignals && onSignalCardClick?.("suggestions")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 mb-1">Your Suggestions</p>
                <p className="text-2xl font-semibold text-amber-700">
                  {currentSignals ? suggestionCount : "--"}
                </p>
                {!currentSignals && (
                  <p className="mt-1 text-xs text-amber-700">Pending suggestions appear here.</p>
                )}
                {currentSignals && onSignalCardClick && (
                  <p className="mt-1 text-xs text-amber-600">Click to view</p>
                )}
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Subject Performance */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parent essentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Signed in as</p>
                    <p className="font-medium text-gray-900">{email ?? "Unknown"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/parent/import-email"
                      className="rounded-lg border border-border px-4 py-2 text-sm"
                    >
                      Import School Email
                    </Link>
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="rounded-lg border border-border px-4 py-2 text-sm"
                      >
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
                {loadError && <p className="mt-3 text-sm text-red-600">{loadError}</p>}
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="text-base font-semibold text-gray-900">Add student</h3>
                <form onSubmit={onAddStudent} className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first-name" className="text-sm font-medium text-gray-700">
                        First name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(event) => onFirstNameChange(event.target.value)}
                        className={cn(
                          "mt-2 w-full rounded-md border px-3 py-2 text-sm",
                          formError?.includes("First name") ? "border-red-300 bg-red-50" : "border-border"
                        )}
                        placeholder="e.g., Maya"
                      />
                      <p className="mt-1 text-xs text-gray-500">Min. 2 characters, letters only</p>
                    </div>
                    <div>
                      <label htmlFor="last-name" className="text-sm font-medium text-gray-700">
                        Last name
                      </label>
                      <input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(event) => onLastNameChange(event.target.value)}
                        className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label htmlFor="grade" className="text-sm font-medium text-gray-700">
                        Grade <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={grade}
                        onValueChange={(value) => onGradeChange(value)}
                      >
                        <SelectTrigger
                          id="grade"
                          className={cn(
                            "mt-2 w-full",
                            formError?.includes("grade") ? "border-red-300 bg-red-50" : ""
                          )}
                        >
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="K">Kindergarten</SelectItem>
                          <SelectItem value="1">1st Grade</SelectItem>
                          <SelectItem value="2">2nd Grade</SelectItem>
                          <SelectItem value="3">3rd Grade</SelectItem>
                          <SelectItem value="4">4th Grade</SelectItem>
                          <SelectItem value="5">5th Grade</SelectItem>
                          <SelectItem value="6">6th Grade</SelectItem>
                          <SelectItem value="7">7th Grade</SelectItem>
                          <SelectItem value="8">8th Grade</SelectItem>
                          <SelectItem value="9">9th Grade</SelectItem>
                          <SelectItem value="10">10th Grade</SelectItem>
                          <SelectItem value="11">11th Grade</SelectItem>
                          <SelectItem value="12">12th Grade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {formError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Add student"}
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Signals & Actions</CardTitle>
              {onSuggestAssignment && (
                <button
                  type="button"
                  onClick={onSuggestAssignment}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  Suggest Task
                </button>
              )}
            </CardHeader>
            <CardContent>
              {!currentSignals && (
                <p className="text-sm text-muted-foreground">Select a student to see signals.</p>
              )}
              {currentSignals && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-800">Overdue items</p>
                    <p className="mt-2 text-2xl font-semibold text-red-700">
                      {currentSignals.overdue_count}
                    </p>
                    <p className="mt-1 text-xs text-red-700">Items needing attention</p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <p className="text-xs font-medium text-purple-800">Upcoming test/project</p>
                    <p className="mt-2 text-sm font-semibold text-purple-700">
                      {nextBigItem ? nextBigItem.title : "None scheduled"}
                    </p>
                    {nextBigItemDate && (
                      <p className="mt-1 text-xs text-purple-600">Due {nextBigItemDate}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-800">Study plan status</p>
                    <p className="mt-2 text-lg font-semibold text-blue-700">{hasPlanLabel}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-800">Pending suggestions</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">{suggestionCount}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

</div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your students</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students yet.</p>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => {
                    const gradeMetric = gradeMetricsByStudentId[student.id] ?? null;
                    const gradeLabel = gradeMetric !== null ? `${Math.round(gradeMetric * 100)}%` : "No grades yet";
                    const isLinked = Boolean(student.student_user_id);
                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "rounded-lg border p-3 text-sm",
                          selectedStudentId === student.id ? "border-blue-200 bg-blue-50" : "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {student.first_name} {student.last_name ?? ""}
                            </div>
                            {student.grade && (
                              <div className="text-xs text-gray-600">Grade: {student.grade}</div>
                            )}
                            <div className="text-xs text-gray-600">Grade metric: {gradeLabel}</div>
                            {isLinked && (
                              <div className="text-xs text-emerald-700">Linked to student account</div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {onInviteStudent && (
                              <button
                                type="button"
                                onClick={() => onInviteStudent(student)}
                                disabled={isLinked}
                                className="text-xs text-blue-600 hover:underline disabled:opacity-60"
                              >
                                {isLinked ? "Linked" : "Invite"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteStudent(student.id)}
                              disabled={deletingStudentId === student.id}
                              className="text-xs text-red-600 hover:underline disabled:opacity-60"
                            >
                              {deletingStudentId === student.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                        {showAdvisorAssignments && (
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Assign advisor</span>
                              <Select
                                value={student.advisor_id ?? "unassigned"}
                                onValueChange={(value) => {
                                  if (!onAssignAdvisor) return;
                                  const nextAdvisorId = value === "unassigned" ? null : value;
                                  if ((student.advisor_id ?? null) === nextAdvisorId) return;
                                  onAssignAdvisor(student.id, nextAdvisorId);
                                }}
                                disabled={
                                  assigningStudentId === student.id || !onAssignAdvisor || isAdvisorsLoading
                                }
                              >
                                <SelectTrigger className="h-8 w-44 text-xs">
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {advisors.map((advisor) => (
                                    <SelectItem key={advisor.id} value={advisor.id}>
                                      {advisor.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {assignmentStatusByStudentId[student.id] && (
                              <p
                                className={cn(
                                  "text-xs",
                                  assignmentStatusByStudentId[student.id]?.type === "error"
                                    ? "text-red-600"
                                    : "text-green-600"
                                )}
                              >
                                {assignmentStatusByStudentId[student.id]?.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {deleteStatus && (
                <p
                  className={cn(
                    "mt-3 text-xs",
                    deleteStatus.type === "error" ? "text-red-600" : "text-green-600"
                  )}
                >
                  {deleteStatus.message}
                </p>
              )}
              {showAdvisorAssignments && advisorLoadError && (
                <p className="mt-2 text-xs text-red-600">{advisorLoadError}</p>
              )}
              {showAdvisorAssignments && isAdvisorsLoading && (
                <p className="mt-2 text-xs text-muted-foreground">Loading advisors...</p>
              )}
              {showAdvisorAssignments && !advisorLoadError && !isAdvisorsLoading && advisors.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">No advisors available.</p>
              )}
            </CardContent>
          </Card>

          {/* Advisor Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Advisor Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {advisorNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No advisor notes yet.</p>
                )}
                {advisorNotes.map((note) => {
                  const advisorName = note.advisor
                    ? `${note.advisor.first_name ?? ""} ${note.advisor.last_name ?? ""}`.trim() || note.advisor.email
                    : "Advisor";
                  const borderColor = note.priority === "high"
                    ? "border-red-400"
                    : note.priority === "medium"
                      ? "border-yellow-400"
                      : "border-blue-400";
                  const bgColor = note.priority === "high"
                    ? "bg-red-50"
                    : note.priority === "medium"
                      ? "bg-yellow-50"
                      : "bg-blue-50";
                  return (
                    <div key={note.id} className={`p-3 rounded-lg border-l-4 ${borderColor} ${bgColor}`}>
                      <p className="font-medium text-sm text-gray-900 mb-1">{advisorName}</p>
                      <p className="text-sm text-gray-700 mb-2">{note.message}</p>
                      <p className="text-xs text-gray-500">{new Date(note.created_at).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

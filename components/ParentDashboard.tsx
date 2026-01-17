"use client"

import { FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { TrendingUp, Calendar, MessageSquare, Award, Clock } from "lucide-react";
import { cn } from "./ui/utils";

type StudentSummary = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  advisor_id?: string | null;
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
  studentOverviews?: StudentOverview[];
  advisorNotes?: AdvisorNote[];
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
  studentOverviews = [],
  advisorNotes = [],
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

  // Get current student overview from real data
  const currentOverview = selectedStudentId
    ? studentOverviews.find(overview => overview.student_id === selectedStudentId)
    : undefined;
  const selectedGradeMetric = selectedStudentId ? gradeMetricsByStudentId[selectedStudentId] ?? null : null;
  const selectedGradePercent = selectedGradeMetric !== null ? Math.round(selectedGradeMetric * 100) : null;

  // Calculate progress percentage based on completed vs total assignments
  const totalAssignments = (currentOverview?.upcoming_assignments_count ?? 0) +
                          (currentOverview?.completed_assignments_count ?? 0) +
                          (currentOverview?.overdue_assignments_count ?? 0);
  const progressPercent = totalAssignments > 0
    ? Math.round(((currentOverview?.completed_assignments_count ?? 0) / totalAssignments) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Student Overview</h1>
          <p className="text-gray-600">Monitor your children&apos;s academic progress</p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedStudentId ?? ""}
            onValueChange={onSelectStudent}
            disabled={studentOptions.length === 0}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {studentOptions.map((child) => (
                <SelectItem key={child.id} value={child.id}>
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

      {/* Performance Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">Overall Grade</p>
                <p className="text-2xl font-semibold text-blue-700">
                  {selectedGradePercent !== null
                    ? `${selectedGradePercent}%`
                    : "No grades yet"}
                </p>
                {!currentOverview && selectedStudentId && (
                  <p className="mt-1 text-xs text-blue-600">Grades appear when assignments are graded.</p>
                )}
                {!selectedStudentId && (
                  <p className="mt-1 text-xs text-blue-600">Select a student to see metrics.</p>
                )}
              </div>
              <Award className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">Progress</p>
                <p className="text-2xl font-semibold text-green-700">
                  {currentOverview ? `${progressPercent}%` : "--"}
                </p>
                {!currentOverview && (
                  <p className="mt-1 text-xs text-green-700">Progress updates show here.</p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 mb-1">Upcoming</p>
                <p className="text-2xl font-semibold text-purple-700">
                  {currentOverview ? currentOverview.upcoming_assignments_count : "--"}
                </p>
                {!currentOverview && (
                  <p className="mt-1 text-xs text-purple-600">Upcoming assignments appear here.</p>
                )}
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 mb-1">Completed</p>
                <p className="text-2xl font-semibold text-orange-700">
                  {currentOverview ? currentOverview.completed_assignments_count : "--"}
                </p>
                {!currentOverview && (
                  <p className="mt-1 text-xs text-orange-700">Completed assignments appear here.</p>
                )}
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
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
                {loadError && <p className="mt-3 text-sm text-red-600">{loadError}</p>}
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="text-base font-semibold text-gray-900">Add student</h3>
                <form onSubmit={onAddStudent} className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first-name" className="text-sm font-medium text-gray-700">
                        First name
                      </label>
                      <input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(event) => onFirstNameChange(event.target.value)}
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
                        onChange={(event) => onLastNameChange(event.target.value)}
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
                        onChange={(event) => onGradeChange(event.target.value)}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!currentOverview && (
                  <p className="text-sm text-muted-foreground">Select a student to see assignment data.</p>
                )}
                {currentOverview && (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Upcoming Assignments</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {currentOverview.upcoming_assignments_count} assignment{currentOverview.upcoming_assignments_count !== 1 ? 's' : ''} due soon
                        </p>
                        {currentOverview.next_due_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Next due: {new Date(currentOverview.next_due_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-2xl font-semibold text-purple-600">
                        {currentOverview.upcoming_assignments_count}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Completed Assignments</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {currentOverview.completed_assignments_count} assignment{currentOverview.completed_assignments_count !== 1 ? 's' : ''} completed
                        </p>
                      </div>
                      <div className="text-2xl font-semibold text-green-600">
                        {currentOverview.completed_assignments_count}
                      </div>
                    </div>

                    {currentOverview.overdue_assignments_count > 0 && (
                      <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900">Overdue Assignments</h4>
                          <p className="text-sm text-red-700 mt-1">
                            {currentOverview.overdue_assignments_count} assignment{currentOverview.overdue_assignments_count !== 1 ? 's' : ''} need attention
                          </p>
                        </div>
                        <div className="text-2xl font-semibold text-red-600">
                          {currentOverview.overdue_assignments_count}
                        </div>
                      </div>
                    )}

                    {currentOverview.last_activity_at && (
                      <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                        <p className="text-xs text-gray-600">
                          Last activity: {new Date(currentOverview.last_activity_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
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
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteStudent(student.id)}
                            disabled={deletingStudentId === student.id}
                            className="text-xs text-red-600 hover:underline disabled:opacity-60"
                          >
                            {deletingStudentId === student.id ? "Deleting..." : "Delete"}
                          </button>
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

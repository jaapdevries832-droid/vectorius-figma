"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { TrendingUp, Calendar, MessageSquare, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "./ui/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "./ui/hover-card";

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
  students: StudentSummary[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  deletingStudentId: string | null;
  deleteStatus: DeleteStatus;
  onDeleteStudent: (id: string) => void;
  gradeMetricsByStudentId?: Record<string, number | null>;
  studentSignals?: ParentSignal[];
  advisorNotes?: AdvisorNote[];
  onSignalCardClick?: (cardType: SignalCardType) => void;
};

export function ParentDashboard({
  students,
  selectedStudentId,
  onSelectStudent,
  deletingStudentId,
  deleteStatus,
  onDeleteStudent,
  gradeMetricsByStudentId = {},
  studentSignals = [],
  advisorNotes = [],
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
        {/* Overdue Items */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
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
          </HoverCardTrigger>
          {currentSignals && (
            <HoverCardContent className="w-72" side="bottom">
              <p className="text-sm font-medium text-gray-900 mb-1">Overdue Assignments</p>
              {currentSignals.overdue_count === 0 ? (
                <p className="text-xs text-gray-600">All caught up! No overdue items.</p>
              ) : (
                <p className="text-xs text-gray-600">
                  {currentSignals.overdue_count} assignment{currentSignals.overdue_count !== 1 ? "s" : ""} past due.
                  Click to view in Assignments.
                </p>
              )}
            </HoverCardContent>
          )}
        </HoverCard>

        {/* Upcoming Test/Project */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
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
          </HoverCardTrigger>
          {currentSignals && (
            <HoverCardContent className="w-72" side="bottom">
              <p className="text-sm font-medium text-gray-900 mb-1">Next Big Item</p>
              {nextBigItem ? (
                <>
                  <p className="text-xs text-gray-800 font-medium">{nextBigItem.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Type: {nextBigItem.type} &middot; Due: {nextBigItemDate}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Click to view schedule.</p>
                </>
              ) : (
                <p className="text-xs text-gray-600">No tests or projects in the next 2 weeks.</p>
              )}
            </HoverCardContent>
          )}
        </HoverCard>

        {/* Study Plan */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
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
          </HoverCardTrigger>
          {currentSignals && (
            <HoverCardContent className="w-72" side="bottom">
              <p className="text-sm font-medium text-gray-900 mb-1">Study Plan</p>
              {currentSignals.has_active_plan ? (
                <p className="text-xs text-gray-600">
                  An active study plan is scheduled. Click to view the weekly schedule.
                </p>
              ) : (
                <p className="text-xs text-gray-600">
                  No active study plan. Generate one from the Assignments page.
                </p>
              )}
            </HoverCardContent>
          )}
        </HoverCard>

        {/* Suggestions */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
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
          </HoverCardTrigger>
          {currentSignals && (
            <HoverCardContent className="w-72" side="bottom">
              <p className="text-sm font-medium text-gray-900 mb-1">Parent Suggestions</p>
              {suggestionCount === 0 ? (
                <p className="text-xs text-gray-600">
                  No pending suggestions. You can suggest assignments from the Assignments page.
                </p>
              ) : (
                <p className="text-xs text-gray-600">
                  {suggestionCount} suggestion{suggestionCount !== 1 ? "s" : ""} waiting for the student to accept.
                  Click to view in Assignments.
                </p>
              )}
            </HoverCardContent>
          )}
        </HoverCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Advisor Notes -- left column */}
        <div className="lg:col-span-2">
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

        {/* Your Students -- right column (simplified) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your students</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students yet. Add one in Settings.</p>
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
                              <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Linked
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

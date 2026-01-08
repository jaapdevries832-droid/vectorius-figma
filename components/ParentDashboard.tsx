"use client"

import { FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { TrendingUp, Calendar, MessageSquare, Bell, Award, Clock } from "lucide-react";
import { cn } from "./ui/utils";

type StudentSummary = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
};

type DeleteStatus = {
  type: "success" | "error";
  message: string;
} | null;

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
  onSignOut?: () => void;
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
  onSignOut,
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

  const performanceData = {
    "1": {
      overallGrade: 92,
      progress: 78,
      subjects: [
        { name: "Mathematics", grade: 94, trend: "up" },
        { name: "English", grade: 89, trend: "stable" },
        { name: "Chemistry", grade: 96, trend: "up" },
        { name: "History", grade: 87, trend: "down" },
      ],
      recentActivities: [
        { type: "assignment", title: "Math Homework Ch. 7", status: "completed", date: "2025-09-04" },
        { type: "quiz", title: "Chemistry Quiz", score: "A+", date: "2025-09-03" },
        { type: "assignment", title: "Essay: Climate Change", status: "submitted", date: "2025-09-02" },
      ]
    },
    "2": {
      overallGrade: 88,
      progress: 85,
      subjects: [
        { name: "Mathematics", grade: 91, trend: "up" },
        { name: "English", grade: 86, trend: "up" },
        { name: "Science", grade: 89, trend: "stable" },
        { name: "Social Studies", grade: 84, trend: "stable" },
      ],
      recentActivities: [
        { type: "assignment", title: "Science Project", status: "in-progress", date: "2025-09-04" },
        { type: "test", title: "Math Test Ch. 5", score: "B+", date: "2025-09-01" },
      ]
    },
    "5": {
      overallGrade: 90,
      progress: 82,
      subjects: [
        { name: "CP Biology", grade: 92, trend: "up" },
        { name: "Algebra", grade: 88, trend: "stable" },
        { name: "English 9CPA", grade: 90, trend: "up" },
        { name: "World History", grade: 87, trend: "stable" },
      ],
      recentActivities: [
        { type: "assignment", title: "Biology Lab Notes", status: "submitted", date: "2025-09-04" },
        { type: "quiz", title: "Spanish 2CP Quiz", score: "A-", date: "2025-09-02" },
        { type: "assignment", title: "Entrepreneurship Pitch Outline", status: "in-progress", date: "2025-09-01" },
      ]
    }
  };

  const advisorNotes = [
    {
      from: "Ms. Johnson - Math Teacher",
      message: "Jordan is excelling in advanced calculus. Consider enrolling in AP Calculus next semester.",
      date: "2025-09-03",
      priority: "medium"
    },
    {
      from: "Mr. Smith - Chemistry Teacher",
      message: "Outstanding performance in lab work. Jordan shows real aptitude for STEM subjects.",
      date: "2025-09-01",
      priority: "low"
    }
  ];

  const notifications = [
    { message: "Parent-Teacher Conference scheduled for Sept 15", type: "event", urgent: true },
    { message: "Jordan's essay received an A grade", type: "achievement", urgent: false },
    { message: "New assignment posted in Chemistry", type: "assignment", urgent: false },
  ];

  const currentData = selectedStudentId
    ? performanceData[selectedStudentId as keyof typeof performanceData]
    : undefined;
  const hasPerformanceData = Boolean(
    currentData && (currentData.subjects.length > 0 || currentData.recentActivities.length > 0)
  );

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? "^" : trend === "down" ? "v" : "-";
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600";
  };

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
                  {currentData ? `${currentData.overallGrade}%` : "--"}
                </p>
                {!hasPerformanceData && (
                  <p className="mt-1 text-xs text-blue-600">Add a student to see metrics.</p>
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
                  {currentData ? `${currentData.progress}%` : "--"}
                </p>
                {!hasPerformanceData && (
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
                <p className="text-sm text-purple-600 mb-1">Subjects</p>
                <p className="text-2xl font-semibold text-purple-700">
                  {currentData ? currentData.subjects.length : "--"}
                </p>
                {!hasPerformanceData && (
                  <p className="mt-1 text-xs text-purple-600">Subjects will appear soon.</p>
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
                <p className="text-sm text-orange-600 mb-1">Activities</p>
                <p className="text-2xl font-semibold text-orange-700">
                  {currentData ? currentData.recentActivities.length : "--"}
                </p>
                {!hasPerformanceData && (
                  <p className="mt-1 text-xs text-orange-700">Activity feed is empty.</p>
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
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(!currentData || currentData.subjects.length === 0) && (
                  <p className="text-sm text-muted-foreground">No performance data yet.</p>
                )}
                {currentData?.subjects.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{subject.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${getTrendColor(subject.trend)}`}>
                            {getTrendIcon(subject.trend)}
                          </span>
                          <span className="font-semibold">{subject.grade}%</span>
                        </div>
                      </div>
                      <Progress value={subject.grade} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(!currentData || currentData.recentActivities.length === 0) && (
                  <p className="text-sm text-muted-foreground">No activities yet.</p>
                )}
                {currentData?.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{activity.type}</span>
                        {activity.score && <span>??? {activity.score}</span>}
                        {activity.status && <span>??? {activity.status}</span>}
                        <span>??? {new Date(activity.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                  {students.map((student) => (
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
                    </div>
                  ))}
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
                {advisorNotes.map((note, index) => (
                  <div key={index} className="p-3 rounded-lg border-l-4 border-blue-400 bg-blue-50">
                    <p className="font-medium text-sm text-gray-900 mb-1">{note.from}</p>
                    <p className="text-sm text-gray-700 mb-2">{note.message}</p>
                    <p className="text-xs text-gray-500">{new Date(note.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    notification.urgent ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {notification.urgent && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                      <Badge variant={notification.urgent ? "destructive" : "secondary"} className="text-xs">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{notification.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

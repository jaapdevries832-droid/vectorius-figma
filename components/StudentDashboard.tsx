"use client"

import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Calendar, Clock, CheckCircle, Circle, Plus, TrendingUp, Book, Target, Sparkles, Trophy, Flame } from "lucide-react";
import { useRoleLayout } from "app/lib/role-layout-context";
import { getCurrentProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase/client";
import {
  addEnrollment,
  createCourse,
  fetchCourses,
  fetchMyEnrollments,
  fetchSubjects,
  removeEnrollment,
  type CourseWithMeetings,
  type EnrollmentWithCourse,
  type Subject,
} from "@/lib/student-classes";
import type { AssignedSkill } from "app/lib/types";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function StudentDashboard() {
  const { setActiveItem } = useRoleLayout();
  const [studentName, setStudentName] = React.useState<string | null>(null);
  const [studentInitials, setStudentInitials] = React.useState<string | null>(null);
  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [headerMessage, setHeaderMessage] = React.useState<string | null>(null);
  const [assignmentCounts, setAssignmentCounts] = React.useState<{ total: number; completed: number } | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = React.useState<{
    total: number;
    completed: number;
    due: number;
    avgGradePercent: number | null;
    progressPercent: number;
  } | null>(null);
  const assignments = [
    { id: 1, title: "Math Homework Ch. 7", subject: "Mathematics", dueDate: "2025-09-06", completed: false, priority: "high" },
    { id: 2, title: "Essay: Climate Change", subject: "English", dueDate: "2025-09-08", completed: true, priority: "medium" },
    { id: 3, title: "Science Lab Report", subject: "Chemistry", dueDate: "2025-09-10", completed: false, priority: "low" },
    { id: 4, title: "History Timeline Project", subject: "History", dueDate: "2025-09-12", completed: false, priority: "medium" },
  ];

  const notes = [
    { text: "Remember to study for Chemistry quiz next week", color: "sticky-note" },
    { text: "Ask Ms. Johnson about extra credit opportunities", color: "sticky-note-blue" },
    { text: "Join study group for Math on Friday", color: "sticky-note-green" },
  ];

  const overallProgress = dashboardMetrics?.progressPercent ?? 0;
  const avgGradeDisplay = dashboardMetrics?.avgGradePercent != null ? `${dashboardMetrics.avgGradePercent}%` : "—";
  const dueCountDisplay = dashboardMetrics ? dashboardMetrics.due : "--";
  const [assignedSkillsCount, setAssignedSkillsCount] = React.useState<number>(0)
  const [courses, setCourses] = React.useState<CourseWithMeetings[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [enrollments, setEnrollments] = React.useState<EnrollmentWithCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = React.useState(false);
  const [subjectsLoading, setSubjectsLoading] = React.useState(false);
  const [enrollmentsLoading, setEnrollmentsLoading] = React.useState(false);
  const [coursesError, setCoursesError] = React.useState<string | null>(null);
  const [subjectsError, setSubjectsError] = React.useState<string | null>(null);
  const [enrollmentsError, setEnrollmentsError] = React.useState<string | null>(null);
  const [enrollmentActionError, setEnrollmentActionError] = React.useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("");
  const [isAddingEnrollment, setIsAddingEnrollment] = React.useState(false);
  const [removingCourseId, setRemovingCourseId] = React.useState<string | null>(null);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createTeacher, setCreateTeacher] = React.useState("");
  const [createLocation, setCreateLocation] = React.useState("");
  const [createCourseError, setCreateCourseError] = React.useState<string | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('assignedSkills') : null
      if (!raw) return
      const arr = JSON.parse(raw) as AssignedSkill[]
      if (!studentId) {
        setAssignedSkillsCount(0)
        return
      }
      setAssignedSkillsCount(arr.filter(a => a.studentId === studentId).length)
    } catch {}
  }, [studentId])

  const refreshEnrollments = React.useCallback(async (studentIdValue: string) => {
    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    try {
      const data = await fetchMyEnrollments(studentIdValue);
      setEnrollments(data);
    } catch (error) {
      console.error("Failed to load enrollments", error);
      setEnrollmentsError("Unable to load your classes right now.");
    } finally {
      setEnrollmentsLoading(false);
    }
  }, []);

  const loadCourses = React.useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (error) {
      console.error("Failed to load courses", error);
      setCoursesError("Unable to load available classes right now.");
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const loadSubjects = React.useCallback(async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const data = await fetchSubjects();
      setSubjects(data);
    } catch (error) {
      console.error("Failed to load subjects", error);
      setSubjectsError("Subjects are unavailable right now.");
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const endOfDay = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(23, 59, 59, 999);
    return nd;
  };

  React.useEffect(() => {
    let isMounted = true;

    const loadStudent = async () => {
      const { user } = await getCurrentProfile();
      if (!isMounted) return;

      if (!user) {
        setHeaderMessage("No student profile found.");
        setStudentName(null);
        setStudentInitials(null);
        setStudentId(null);
        setAssignmentCounts(null);
        setDashboardMetrics(null);
        return;
      }

      const { data: student, error } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("student_user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !student) {
        setHeaderMessage("No student profile found.");
        setStudentName(null);
        setStudentInitials(null);
        setStudentId(null);
        setAssignmentCounts(null);
        setDashboardMetrics(null);
        return;
      }

      const fullName = `${student.first_name} ${student.last_name ?? ""}`.trim();
      const initials = `${student.first_name?.[0] ?? ""}${student.last_name?.[0] ?? ""}`.toUpperCase();
      setHeaderMessage(null);
      setStudentName(fullName || "Student");
      setStudentInitials(initials || "ST");
      setStudentId(student.id);

      const { data: assignmentRows } = await supabase
        .from("assignments")
        .select("id, completed_at, due_at, score, max_score")
        .eq("student_id", student.id);

      if (!isMounted) return;

      const rows = assignmentRows ?? [];
      const total = rows.length;
      const completed = rows.filter((row) => row.completed_at).length;
      const endOfToday = endOfDay(new Date());
      let due = 0;
      let sumScore = 0;
      let sumMax = 0;
      rows.forEach((row) => {
        if (!row.completed_at && row.due_at) {
          const dueAt = new Date(row.due_at);
          if (dueAt < endOfToday) due += 1;
        }
        if (row.max_score != null && row.score != null) {
          sumScore += row.score;
          sumMax += row.max_score;
        }
      });
      const avgGradePercent = sumMax > 0 ? Math.round((sumScore / sumMax) * 100) : null;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      setAssignmentCounts({ total, completed });
      setDashboardMetrics({ total, completed, due, avgGradePercent, progressPercent });
    };

    loadStudent();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!studentId) return;
    refreshEnrollments(studentId);
    loadCourses();
    loadSubjects();
  }, [studentId, refreshEnrollments, loadCourses, loadSubjects]);

  const enrolledCourseIds = React.useMemo(() => new Set(enrollments.map((item) => item.course_id)), [enrollments]);
  const availableCourses = React.useMemo(
    () => courses.filter((course) => !enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds],
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const abbrevDays = (days: string[]) => {
    const map: Record<string, string> = {
      Monday: 'M',
      Tuesday: 'T',
      Wednesday: 'W',
      Thursday: 'Th',
      Friday: 'F',
      Saturday: 'Sa',
      Sunday: 'Su',
    };
    return days.map(d => map[d] ?? d[0]).join('');
  };

  const formatTimeHuman = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m}`;
  };

  const getStatusBadge = (completed: boolean) => {
    if (completed) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>;
  };

  const dayNameFromIndex = (dayIndex: number) => {
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[dayIndex] ?? "Day";
  };

  const summarizeMeeting = (meetings: CourseWithMeetings["course_meetings"]) => {
    if (!meetings || meetings.length === 0) return null;
    const sorted = [...meetings].sort((a, b) => (a.start_time < b.start_time ? -1 : 1));
    const days = Array.from(new Set(sorted.map((meeting) => dayNameFromIndex(meeting.day_of_week))));
    return {
      days,
      startTime: sorted[0].start_time,
      endTime: sorted[0].end_time,
    };
  };

  const handleAddEnrollment = async () => {
    if (!studentId || !selectedCourseId) return;
    setEnrollmentActionError(null);
    setIsAddingEnrollment(true);
    const error = await addEnrollment(studentId, selectedCourseId);
    if (error) {
      if (error.code === "23505") {
        setEnrollmentActionError("You're already enrolled in that class.");
      } else {
        setEnrollmentActionError("Unable to add that class right now.");
      }
      setIsAddingEnrollment(false);
      return;
    }
    await refreshEnrollments(studentId);
    setSelectedCourseId("");
    setIsAddingEnrollment(false);
  };

  const handleRemoveEnrollment = async (courseId: string) => {
    if (!studentId) return;
    setEnrollmentActionError(null);
    setRemovingCourseId(courseId);
    const error = await removeEnrollment(studentId, courseId);
    if (error) {
      setEnrollmentActionError("Unable to remove that class right now.");
      setRemovingCourseId(null);
      return;
    }
    await refreshEnrollments(studentId);
    setRemovingCourseId(null);
  };

  const handleCreateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentId) return;
    setCreateCourseError(null);
    const trimmedTitle = createTitle.trim();
    if (!trimmedTitle) {
      setCreateCourseError("Class title is required.");
      return;
    }
    const subject = subjects[0];
    if (!subject) {
      setCreateCourseError("No subjects available. Ask an admin to add one.");
      return;
    }
    setIsCreatingCourse(true);
    const { id, error } = await createCourse({
      title: trimmedTitle,
      teacher_name: createTeacher.trim() || null,
      location: createLocation.trim() || null,
      subject_id: subject.id,
      created_by_student_id: studentId,
    });
    if (error || !id) {
      setCreateCourseError("Unable to create the class right now.");
      setIsCreatingCourse(false);
      return;
    }
    const enrollError = await addEnrollment(studentId, id);
    if (enrollError) {
      setCreateCourseError("Class created, but enrollment failed.");
      setIsCreatingCourse(false);
      await loadCourses();
      return;
    }
    await Promise.all([loadCourses(), refreshEnrollments(studentId)]);
    setCreateTitle("");
    setCreateTeacher("");
    setCreateLocation("");
    setIsCreatingCourse(false);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50/50 via-white to-green-50/30 p-8 space-grid-6 animate-fade-in">
      {/* Welcome Header Card */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-grid-4">
              {headerMessage ? (
                <div className="text-gray-600">{headerMessage}</div>
              ) : (
                <>
                  <Avatar className="w-16 h-16 ring-4 ring-blue-200/50 ring-offset-4">
                    <AvatarImage src="" alt={studentName ?? "Student"} />
                    <AvatarFallback className="bg-gradient-primary text-white text-xl font-semibold">
                      {studentInitials ?? "ST"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                      Welcome back, {studentName ?? "Student"}!
                    </h1>
                    <p className="text-gray-600">Ready to continue your learning journey today?</p>
                    <div className="flex items-center mt-2 space-grid-2">
                      <Badge className="bg-blue-100 text-blue-700">
                        {assignmentCounts ? `${assignmentCounts.total} assignments` : "Assignments"}
                      </Badge>
                      {assignedSkillsCount > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {assignedSkillsCount} skill module{assignedSkillsCount > 1 ? 's' : ''} assigned
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="flex space-grid-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-semibold text-blue-600">{overallProgress}%</div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                  <Book className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-semibold text-green-600">
                  {assignmentCounts ? assignmentCounts.completed : "--"}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-semibold text-purple-600">{avgGradeDisplay}</div>
                <div className="text-sm text-gray-600">Avg Grade</div>
              </div>
              {/* Points card */}
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-semibold text-amber-600">{dueCountDisplay}</div>
                <div className="text-sm text-gray-600">Due</div>
                <div className="mt-2 flex flex-col items-center gap-1">
                  <button
                    aria-label="Due through today"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs border border-orange-200 hover:bg-orange-100 transition"
                    onClick={() => {
                      // TODO: open streak history modal
                      console.log('Open streak history');
                    }}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Due through today
                  </button>
                  <div className="text-xs text-gray-500">Assignments due or overdue by end of today</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setActiveItem('achievements')}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View Rewards
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-br from-blue-500 to-green-500 border-0 shadow-xl rounded-2xl text-white card-hover">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-grid-2 text-white/95">
            <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
            Academic Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-grid-4">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/90 font-medium">Overall Completion</span>
              <span className="text-xl font-semibold text-white">{overallProgress}%</span>
            </div>
            <div className="bg-white/20 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-700 ease-out shadow-lg"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-6 pt-4">
            {[
              { label: "Mathematics", progress: 89, color: "bg-yellow-400" },
              { label: "English", progress: 76, color: "bg-green-400" },
              { label: "Chemistry", progress: 94, color: "bg-purple-400" },
              { label: "History", progress: 67, color: "bg-pink-400" }
            ].map((subject, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-semibold text-white mb-1">{subject.progress}%</div>
                <div className={`h-2 ${subject.color} rounded-full mb-2 shadow-sm`} />
                <div className="text-xs text-white/80">{subject.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Classes */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-grid-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Book className="w-4 h-4 text-white" />
            </div>
            My Classes
          </CardTitle>
          <div className="flex items-center space-grid-2">
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={coursesLoading || availableCourses.length === 0}
            >
              <SelectTrigger className="w-[220px] rounded-xl border-gray-200 bg-white/80">
                <SelectValue placeholder={coursesLoading ? "Loading courses..." : "Select a class"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id} className="rounded-lg">
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
              disabled={!selectedCourseId || isAddingEnrollment}
              onClick={handleAddEnrollment}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-grid-3">
          {coursesError && <div className="text-sm text-red-600">{coursesError}</div>}
          {subjectsError && <div className="text-sm text-red-600">{subjectsError}</div>}
          {enrollmentsError && <div className="text-sm text-red-600">{enrollmentsError}</div>}
          {enrollmentActionError && <div className="text-sm text-red-600">{enrollmentActionError}</div>}
          {!coursesLoading && courses.length === 0 && (
            <form
              onSubmit={handleCreateCourse}
              className="space-grid-3 rounded-2xl border border-gray-100 bg-white/60 p-4"
            >
              <div className="text-sm font-medium text-gray-900">Create a class</div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Class title"
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                  disabled={isCreatingCourse || subjectsLoading}
                  required
                  className="rounded-xl border-gray-200 bg-white/80"
                />
                <Input
                  placeholder="Teacher (optional)"
                  value={createTeacher}
                  onChange={(event) => setCreateTeacher(event.target.value)}
                  disabled={isCreatingCourse || subjectsLoading}
                  className="rounded-xl border-gray-200 bg-white/80"
                />
                <Input
                  placeholder="Location (optional)"
                  value={createLocation}
                  onChange={(event) => setCreateLocation(event.target.value)}
                  disabled={isCreatingCourse || subjectsLoading}
                  className="rounded-xl border-gray-200 bg-white/80"
                />
              </div>
              {subjects.length === 0 && !subjectsLoading && (
                <div className="text-xs text-muted-foreground">
                  No subjects available yet. Ask an admin to add one.
                </div>
              )}
              {createCourseError && <div className="text-sm text-red-600">{createCourseError}</div>}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  type="submit"
                  className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
                  disabled={isCreatingCourse || subjectsLoading || subjects.length === 0}
                >
                  Create Class
                </Button>
              </div>
            </form>
          )}
          {courses.length > 0 && availableCourses.length === 0 && !coursesLoading && (
            <div className="text-sm text-muted-foreground">No additional classes available.</div>
          )}
          {enrollmentsLoading && (
            <div className="text-sm text-muted-foreground">Loading your classes...</div>
          )}
          {!enrollmentsLoading && enrollments.length === 0 && (
            <div className="text-sm text-muted-foreground">You are not enrolled in any classes yet.</div>
          )}
          {enrollments.map((enrollment) => {
            const course = enrollment.course;
            if (!course) return null;
            const meeting = summarizeMeeting(course.course_meetings);
            return (
              <div
                key={enrollment.id}
                className="flex items-start justify-between p-6 rounded-2xl border border-gray-100 bg-white/60 hover:bg-white hover:border-gray-200 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start space-grid-4">
                  <span className="mt-1 w-3 h-3 rounded-full bg-blue-500"></span>
                  <div>
                    <div className="font-semibold text-gray-900 leading-tight">{course.title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {course.teacher_name ?? "Staff"} - {course.location ?? "TBD"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-grid-3">
                  {meeting ? (
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs font-medium rounded-lg">
                      {abbrevDays(meeting.days)} {formatTimeHuman(meeting.startTime)} - {formatTimeHuman(meeting.endTime)}
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs font-medium rounded-lg">
                      Schedule TBD
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={removingCourseId === course.id}
                    onClick={() => handleRemoveEnrollment(course.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Skill Modules summary */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-grid-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Learn How to Learn
          </CardTitle>
          <Button size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 btn-glow" onClick={()=>setActiveItem('skills')}>
            View Modules
          </Button>
        </CardHeader>
        <CardContent className="space-grid-3">
          <div className="flex items-center justify-between p-4 rounded-2xl border bg-white/60">
            <div>
              <div className="text-sm text-gray-600">Assigned Modules</div>
              <div className="text-2xl font-semibold text-emerald-600">{assignedSkillsCount}</div>
            </div>
            <div className="text-sm text-gray-600">Build skills in note-taking, test prep, and time management</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Assignments Section */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-grid-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                Upcoming Assignments
              </CardTitle>
              <Button size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 btn-glow">
                <Plus className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-grid-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 bg-white/60 hover:bg-white transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start space-grid-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto mt-1"
                    >
                      {assignment.completed ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      )}
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className={`font-medium text-lg ${assignment.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {assignment.title}
                          </h4>
                          <p className="text-gray-600 text-sm mt-1">{assignment.subject}</p>
                        </div>
                        <div className="flex items-center space-grid-2">
                          <Badge className={`${getPriorityColor(assignment.priority)} text-xs font-medium`}>
                            {assignment.priority}
                          </Badge>
                          {getStatusBadge(assignment.completed)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-grid-3 text-sm text-gray-600">
                        <div className="flex items-center space-grid">
                          <Calendar className="w-4 h-4" />
                          <span>Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-grid">
                          <Clock className="w-4 h-4" />
                          <span>2 days left</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-grid-6">
          {/* Notes Section */}
          <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-grid-2">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <Book className="w-4 h-4 text-white" />
                </div>
                Quick Notes
              </CardTitle>
              <Button size="sm" variant="ghost" className="p-2 rounded-xl hover:bg-gray-100">
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-grid-3">
              {notes.map((note, index) => (
                <div key={index} className={`p-4 rounded-xl ${note.color} shadow-sm cursor-pointer`}>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed">{note.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Chat Quick Access */}
          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 shadow-xl rounded-2xl text-white card-hover overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center space-grid-2 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                AI Tutor Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/90 mb-6 leading-relaxed">
                Get instant help with homework, explanations, and study guidance from your AI tutor.
              </p>
              <Button className="w-full bg-white/20 hover:bg-white/30 border border-white/20 text-white font-medium py-3 rounded-xl transition-all duration-200 btn-glow">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Chat Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

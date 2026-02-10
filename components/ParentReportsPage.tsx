"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Calendar,
  GraduationCap,
  BarChart3,
  Clock
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getCurrentProfile } from "@/lib/profile"

type ChildReport = {
  student_id: string
  parent_id: string
  student_name: string
  grade: string | null
  active_assignments: number
  completed_assignments: number
  overdue_assignments: number
  avg_grade_percent: number | null
  last_completion: string | null
  last_assignment_added: string | null
}

type RecentAssignment = {
  id: string
  title: string
  type: string
  score: number | null
  max_score: number | null
  completed_at: string | null
  due_at: string | null
  status: string
}

type UpcomingAssignment = {
  id: string
  title: string
  type: string
  due_at: string
}

export function ParentReportsPage() {
  const [reports, setReports] = useState<ChildReport[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([])
  const [upcomingAssignments, setUpcomingAssignments] = useState<UpcomingAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadReports = async () => {
      setIsLoading(true)
      setLoadError(null)

      const { user } = await getCurrentProfile()

      if (!isMounted) return

      if (!user) {
        setLoadError("Please sign in to view reports.")
        setIsLoading(false)
        return
      }

      // Load from parent_children_report view
      const { data, error } = await supabase
        .from("parent_children_report")
        .select("*")
        .eq("parent_id", user.id)

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setIsLoading(false)
        return
      }

      const reportData = (data ?? []) as ChildReport[]
      setReports(reportData)

      if (reportData.length > 0 && !selectedChildId) {
        setSelectedChildId(reportData[0].student_id)
      }

      setIsLoading(false)
    }

    loadReports()

    return () => {
      isMounted = false
    }
  }, [selectedChildId])

  // Load recent and upcoming assignments for selected child
  useEffect(() => {
    if (!selectedChildId) {
      setRecentAssignments([])
      setUpcomingAssignments([])
      return
    }

    let isMounted = true

    const loadAssignments = async () => {
      // Recent completed assignments with scores
      const { data: recent } = await supabase
        .from("assignments")
        .select("id, title, type, score, max_score, completed_at, due_at, status")
        .eq("student_id", selectedChildId)
        .eq("status", "done")
        .order("completed_at", { ascending: false })
        .limit(5)

      if (!isMounted) return

      setRecentAssignments(recent ?? [])

      // Upcoming assignments (not completed, due in next 14 days)
      const twoWeeksFromNow = new Date()
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

      const { data: upcoming } = await supabase
        .from("assignments")
        .select("id, title, type, due_at")
        .eq("student_id", selectedChildId)
        .neq("status", "done")
        .not("due_at", "is", null)
        .lte("due_at", twoWeeksFromNow.toISOString())
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(5)

      if (!isMounted) return

      setUpcomingAssignments((upcoming ?? []) as UpcomingAssignment[])
    }

    loadAssignments()

    return () => {
      isMounted = false
    }
  }, [selectedChildId])

  const selectedReport = reports.find((r) => r.student_id === selectedChildId)

  const formatDate = (iso: string | null) => {
    if (!iso) return "--"
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "--"
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getGradeColor = (percent: number | null) => {
    if (percent === null) return "text-gray-500"
    if (percent >= 90) return "text-green-600"
    if (percent >= 80) return "text-blue-600"
    if (percent >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getGradeBadge = (percent: number | null) => {
    if (percent === null) return <Badge variant="outline">No grades</Badge>
    if (percent >= 90) return <Badge className="bg-green-100 text-green-700 border-green-200">A</Badge>
    if (percent >= 80) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">B</Badge>
    if (percent >= 70) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">C</Badge>
    if (percent >= 60) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">D</Badge>
    return <Badge className="bg-red-100 text-red-700 border-red-200">F</Badge>
  }

  const getCompletionRate = () => {
    if (!selectedReport) return 0
    const total = selectedReport.active_assignments + selectedReport.completed_assignments
    if (total === 0) return 0
    return Math.round((selectedReport.completed_assignments / total) * 100)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{loadError}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="font-medium text-muted-foreground">No children added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add a child from the dashboard to see their reports.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-muted-foreground">Track your children&apos;s academic progress</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Viewing:</span>
          <Select
            value={selectedChildId ?? ""}
            onValueChange={setSelectedChildId}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((report) => {
                const initials = report.student_name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()
                return (
                  <SelectItem key={report.student_id} value={report.student_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">{initials || "ST"}</AvatarFallback>
                      </Avatar>
                      <span>{report.student_name}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedReport && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${getGradeColor(selectedReport.avg_grade_percent)}`}>
                      {selectedReport.avg_grade_percent !== null
                        ? `${selectedReport.avg_grade_percent}%`
                        : "--"}
                    </p>
                    <p className="text-sm text-muted-foreground">Average Grade</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getCompletionRate()}%</p>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{selectedReport.active_assignments}</p>
                    <p className="text-sm text-muted-foreground">Active Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{selectedReport.overdue_assignments}</p>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No completed assignments with scores yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentAssignments.map((assignment) => {
                      const scorePercent =
                        assignment.max_score && assignment.max_score > 0
                          ? Math.round((assignment.score ?? 0) / assignment.max_score * 100)
                          : null
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-sm">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(assignment.completed_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            {scorePercent !== null ? (
                              <>
                                <p className={`font-semibold ${getGradeColor(scorePercent)}`}>
                                  {assignment.score}/{assignment.max_score}
                                </p>
                                {getGradeBadge(scorePercent)}
                              </>
                            ) : (
                              <Badge variant="outline">No score</Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming (Next 2 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming assignments in the next 2 weeks.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAssignments.map((assignment) => {
                      const daysUntil = Math.ceil(
                        (new Date(assignment.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )
                      const isUrgent = daysUntil <= 2
                      return (
                        <div
                          key={assignment.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isUrgent ? "bg-red-50 border border-red-200" : "bg-muted/50"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm">{assignment.title}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {assignment.type}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${isUrgent ? "text-red-600" : ""}`}>
                              {formatDate(assignment.due_at)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {daysUntil === 0
                                ? "Today"
                                : daysUntil === 1
                                ? "Tomorrow"
                                : `${daysUntil} days`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Completed</p>
                  <p className="text-2xl font-bold mt-1">{selectedReport.completed_assignments}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Last Completed</p>
                  <p className="text-lg font-medium mt-1">
                    {formatDateTime(selectedReport.last_completion)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Last Assignment Added</p>
                  <p className="text-lg font-medium mt-1">
                    {formatDateTime(selectedReport.last_assignment_added)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

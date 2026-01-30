"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  BookOpen,
  TrendingUp,
  Clock,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  MessageSquare
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type StudentProfileModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  studentGrade: string | null
  studentSubject: string
  performance: number
  gradeMetric: number | null
  avatar: string
}

type AdvisorNote = {
  id: string
  message: string
  priority: string
  created_at: string
}

type AssignmentSummary = {
  total: number
  completed: number
  overdue: number
  pending: number
}

export function StudentProfileModal({
  open,
  onClose,
  studentId,
  studentName,
  studentGrade,
  studentSubject,
  performance,
  gradeMetric,
  avatar
}: StudentProfileModalProps) {
  const [notes, setNotes] = useState<AdvisorNote[]>([])
  const [assignmentSummary, setAssignmentSummary] = useState<AssignmentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!open || !studentId) return

    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)

      // Load advisor notes for this student
      const { data: notesData } = await supabase
        .from("advisor_notes")
        .select("id, message, priority, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(5)

      // Load assignment summary
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("id, status, completed_at, due_at, is_suggested, suggestion_status")
        .eq("student_id", studentId)

      if (!isMounted) return

      setNotes(notesData ?? [])

      if (assignmentsData) {
        const now = new Date()
        const endOfToday = new Date(now)
        endOfToday.setHours(23, 59, 59, 999)

        // Filter to active assignments (not pending suggestions, not declined)
        const active = assignmentsData.filter((a) => {
          const isPending = a.is_suggested && (!a.suggestion_status || a.suggestion_status === "pending")
          return !isPending && a.suggestion_status !== "declined"
        })

        const completed = active.filter(
          (a) => a.completed_at || a.status === "done" || a.status === "completed"
        ).length

        const overdue = active.filter((a) => {
          if (a.completed_at || a.status === "done" || a.status === "completed") return false
          if (!a.due_at) return false
          return new Date(a.due_at) < endOfToday
        }).length

        const pending = assignmentsData.filter((a) =>
          a.is_suggested && (!a.suggestion_status || a.suggestion_status === "pending")
        ).length

        setAssignmentSummary({
          total: active.length,
          completed,
          overdue,
          pending,
        })
      }

      setIsLoading(false)
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [open, studentId])

  const getStatusBadge = () => {
    if (performance >= 90) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Excellent</Badge>
    }
    if (performance >= 80) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Good</Badge>
    }
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Needs Attention</Badge>
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "low":
        return "border-l-gray-300"
      default:
        return "border-l-blue-500"
    }
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>

        {/* Header Section */}
        <div className="flex items-start gap-4 pb-4 border-b">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl font-medium">
              {avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold">{studentName}</h2>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {studentGrade && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>Grade {studentGrade}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{studentSubject}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Performance</span>
              </div>
              <p className="text-2xl font-bold mt-1">{performance}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-muted-foreground">Grade Metric</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {gradeMetric !== null ? `${Math.round(gradeMetric * 100)}%` : "--"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? "--" : assignmentSummary?.completed ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-muted-foreground">Overdue</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? "--" : assignmentSummary?.overdue ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assignment Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse h-12 bg-gray-100 rounded" />
            ) : assignmentSummary ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Active</span>
                  <span className="font-medium">{assignmentSummary.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-green-600">{assignmentSummary.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overdue</span>
                  <span className="font-medium text-red-600">{assignmentSummary.overdue}</span>
                </div>
                {assignmentSummary.pending > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending Suggestions</span>
                    <span className="font-medium text-yellow-600">{assignmentSummary.pending}</span>
                  </div>
                )}
                {assignmentSummary.total > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: `${Math.round((assignmentSummary.completed / assignmentSummary.total) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((assignmentSummary.completed / assignmentSummary.total) * 100)}% completion rate
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No assignment data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Recent Advisor Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-16 bg-gray-100 rounded" />
                <div className="h-16 bg-gray-100 rounded" />
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border-l-4 bg-muted/50 ${getPriorityColor(note.priority)}`}
                  >
                    <p className="text-sm">{note.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatDate(note.created_at)}</span>
                      <Badge variant="outline" className="text-xs">
                        {note.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No advisor notes yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

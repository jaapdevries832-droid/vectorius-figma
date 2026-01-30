"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Avatar, AvatarFallback } from "./ui/avatar"
import {
  Users,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronRight
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getCurrentProfile } from "@/lib/profile"
import { useRoleLayout } from "app/lib/role-layout-context"

type StudentStatus = "excellent" | "good" | "needs-attention"
type AdvisorStudent = {
  id: string
  name: string
  grade: string | null
  subject: string
  performance: number
  status: StudentStatus
  lastActivity: string
  assignments: number
  pendingTasks: number
  avatar: string
  gradeMetric: number | null
}

export function AdvisorStudentsPage() {
  const { setActiveItem } = useRoleLayout()
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<AdvisorStudent[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadStudents = async () => {
      const { user } = await getCurrentProfile()

      if (!isMounted) return

      if (!user) {
        setLoadError("Please sign in to view your roster.")
        setStudents([])
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("advisor_student_summary")
        .select("*")
        .eq("advisor_id", user.id)
        .order("last_activity_at", { ascending: false })

      if (error) {
        setLoadError(error.message)
        setStudents([])
        setIsLoading(false)
        return
      }

      setLoadError(null)

      const nextStudents = (data ?? []).map((row) => {
        const name = row.student_name || "Student"
        const performance = row.performance ?? 0
        const status: StudentStatus =
          performance >= 90 ? "excellent" : performance >= 80 ? "good" : "needs-attention"
        const initials = name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part[0])
          .join("")
          .toUpperCase()

        return {
          id: row.student_id,
          name,
          grade: row.grade ?? null,
          subject: row.subject_focus ?? "General Studies",
          performance,
          status,
          lastActivity: row.last_activity_at ?? new Date().toISOString(),
          assignments: row.assignments_open ?? 0,
          pendingTasks: row.pending_tasks ?? 0,
          avatar: initials || "ST",
          gradeMetric: row.grade_metric,
        }
      })

      setStudents(nextStudents)
      setIsLoading(false)
    }

    loadStudents()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.subject.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: StudentStatus) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-700 border-green-200"
      case "good":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "needs-attention":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusLabel = (status: StudentStatus) => {
    switch (status) {
      case "excellent":
        return "Excellent"
      case "good":
        return "Good"
      case "needs-attention":
        return "Needs Attention"
      default:
        return "Unknown"
    }
  }

  const formatLastActivity = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Summary stats
  const totalStudents = students.length
  const excellentCount = students.filter((s) => s.status === "excellent").length
  const needsAttentionCount = students.filter((s) => s.status === "needs-attention").length
  const avgPerformance = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.performance, 0) / students.length)
    : 0

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Students</h1>
          <p className="text-muted-foreground">Manage and monitor your assigned students</p>
        </div>
        <Button variant="outline" onClick={() => setActiveItem("dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{excellentCount}</p>
                <p className="text-sm text-muted-foreground">Excellent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{needsAttentionCount}</p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgPerformance}%</p>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {students.length === 0 ? (
                <>
                  <p className="font-medium">No students assigned</p>
                  <p className="text-sm mt-1">Students will appear here once they are assigned to you.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">No matching students</p>
                  <p className="text-sm mt-1">Try adjusting your search term.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Roster ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Navigate back to dashboard with this student selected
                    // In future: could open a detail modal
                    setActiveItem("dashboard")
                  }}
                >
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-medium">
                      {student.avatar}
                    </AvatarFallback>
                  </Avatar>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{student.name}</span>
                      {student.grade && (
                        <Badge variant="outline" className="text-xs">
                          Grade {student.grade}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{student.subject}</p>
                  </div>

                  {/* Performance */}
                  <div className="hidden sm:block text-center">
                    <p className="text-lg font-semibold">{student.performance}%</p>
                    <Badge className={`text-xs ${getStatusColor(student.status)}`}>
                      {getStatusLabel(student.status)}
                    </Badge>
                  </div>

                  {/* Assignments */}
                  <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{student.assignments} active</span>
                    </div>
                    {student.pendingTasks > 0 && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{student.pendingTasks} pending</span>
                      </div>
                    )}
                  </div>

                  {/* Last Activity */}
                  <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatLastActivity(student.lastActivity)}</span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

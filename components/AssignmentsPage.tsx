"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import type { ScheduledCourse } from "app/lib/domain"
import { AssignmentModal, type AssignmentInput, type AssignmentType } from "./AssignmentModal"
import { BookOpen, HelpCircle, ClipboardCheck, Briefcase, Calendar, CalendarDays, AlertCircle, Edit, Trash2, Plus, ExternalLink, Copy, ChevronDown, Check, Trophy, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { GamificationCongratsModal } from "./GamificationCongratsModal"
import { StudyPlanPreview, type StudyMilestone } from "./StudyPlanPreview"
import { supabase } from "@/lib/supabase/client"
import { getCurrentProfile } from "@/lib/profile"
import { fetchStudentScheduleEvents, mapScheduleEventsToCourses } from "@/lib/student-schedule"

type Assignment = {
  id: string
  title: string
  type: AssignmentType
  classId: string
  dueAt: string | null
  notes?: string | null
  status: string
  completedAt: string | null
  courseTitle?: string | null
  courseTeacher?: string | null
  priority?: string | null
  pointsAvailable?: number
  pointsEarned?: number
  source?: TaskSource | null
  createdByRole?: string | null
  isSuggested?: boolean
  suggestionStatus?: SuggestionStatus | null
}

type TaskSource = 'student' | 'parent' | 'advisor' | 'ai' | 'google_classroom' | 'manual_import'
type SuggestionStatus = 'pending' | 'accepted' | 'declined'

const typeMeta: Record<AssignmentType, { icon: LucideIcon; color: string; badge: string }> = {
  homework: { icon: BookOpen, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  quiz: { icon: HelpCircle, color: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  test: { icon: ClipboardCheck, color: 'text-green-600', badge: 'bg-green-100 text-green-700 border-green-200' },
  project: { icon: Briefcase, color: 'text-pink-600', badge: 'bg-pink-100 text-pink-700 border-pink-200' },
}

function formatMonthDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function startOfDay(d: Date) { const nd = new Date(d); nd.setHours(0,0,0,0); return nd }
function endOfDay(d: Date) { const nd = new Date(d); nd.setHours(23, 59, 59, 999); return nd }
function categorize(dueIso: string | null) {
  if (!dueIso) return 'Upcoming'
  const startToday = startOfDay(new Date())
  const endToday = endOfDay(startToday)
  const due = new Date(dueIso)
  if (due < startToday) return 'Overdue'
  if (due <= endToday) return 'Today'
  return 'Upcoming'
}

function normalizeAssignmentType(value: string | null | undefined): AssignmentType {
  if (value === 'homework' || value === 'quiz' || value === 'test' || value === 'project') {
    return value
  }
  return 'homework'
}

const sourceLabels: Record<TaskSource, string> = {
  student: 'Added by Student',
  parent: 'Added by Parent',
  advisor: 'Added by Advisor',
  ai: 'Suggested by AI',
  google_classroom: 'Imported from Classroom',
  manual_import: 'Imported Manually',
}

function resolveSourceLabel(source: TaskSource | null | undefined, createdByRole: string | null | undefined) {
  const fallback = (createdByRole as TaskSource | undefined) ?? 'student'
  return sourceLabels[source ?? fallback] ?? 'Added'
}

function resolveSource(role: string | null | undefined): TaskSource {
  if (role === 'parent') return 'parent'
  if (role === 'advisor') return 'advisor'
  if (role === 'student') return 'student'
  return 'student'
}

export function AssignmentsPage() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    Overdue: true,
    Today: true,
    Upcoming: true,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [classes, setClasses] = useState<ScheduledCourse[]>([])
  const [studentId, setStudentId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [congratsOpen, setCongratsOpen] = useState(false)
  const [congratsPoints, setCongratsPoints] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<'active' | 'pending'>('active')
  const [studyPlanOpen, setStudyPlanOpen] = useState(false)
  const [studyPlanLoading, setStudyPlanLoading] = useState(false)
  const [studyPlanAssignment, setStudyPlanAssignment] = useState<Assignment | null>(null)
  const [studyPlanMilestones, setStudyPlanMilestones] = useState<StudyMilestone[]>([])
  const [studyPlanId, setStudyPlanId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadAssignments = async () => {
      setIsLoading(true)
      setLoadError(null)

      const { user, profile } = await getCurrentProfile()

      if (!isMounted) return

      if (!user) {
        setLoadError('Please sign in to view assignments.')
        setAssignments([])
        setIsLoading(false)
        return
      }

      setCurrentUserId(user.id)
      setCurrentRole(profile?.role ?? null)
      setCurrentProfileId(profile?.id ?? null)

      if (profile?.role && profile.role !== "student") {
        setLoadError("Assignments are available for student accounts only.")
        setAssignments([])
        setIsLoading(false)
        return
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('student_user_id', user.id)
        .maybeSingle()

      if (!isMounted) return

      if (studentError) {
        setLoadError(studentError.message)
        setAssignments([])
        setIsLoading(false)
        return
      }

      if (!student) {
        setLoadError('No student profile is linked to this account.')
        setAssignments([])
        setIsLoading(false)
        return
      }

      setStudentId(student.id)

      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, type, description, due_at, status, completed_at, priority, course_id, source, created_by_role, is_suggested, suggestion_status, course:courses (title, teacher_name)')
        .eq('student_id', student.id)
        .order('due_at', { ascending: true })

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setAssignments([])
        setIsLoading(false)
        return
      }

      const mapped = (data ?? []).map((row) => {
        const course = Array.isArray(row.course) ? row.course[0] : row.course
        return {
        id: row.id,
        title: row.title ?? 'Untitled Assignment',
        type: normalizeAssignmentType(row.type),
        classId: row.course_id ?? '',
        dueAt: row.due_at,
        notes: row.description ?? null,
        status: row.status,
        completedAt: row.completed_at,
        courseTitle: course?.title ?? null,
        courseTeacher: course?.teacher_name ?? null,
        priority: row.priority ?? null,
        source: row.source ?? null,
        createdByRole: row.created_by_role ?? null,
        isSuggested: row.is_suggested ?? false,
        suggestionStatus: row.suggestion_status ?? null,
        }
      })

      setAssignments(mapped)
      setIsLoading(false)
    }

    loadAssignments()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadSchedule = async () => {
      const { user, profile } = await getCurrentProfile()

      if (!isMounted) return

      if (!user) {
        setClasses([])
        return
      }

      if (profile?.role && profile.role !== "student") {
        setClasses([])
        return
      }

      const { data, error } = await fetchStudentScheduleEvents()

      if (!isMounted) return

      if (error) {
        console.error("Failed to load schedule events", error)
        setLoadError("Unable to load class labels right now.")
        setClasses([])
        return
      }

      setClasses(mapScheduleEventsToCourses(data))
    }

    loadSchedule()

    return () => {
      isMounted = false
    }
  }, [])

  const isPendingSuggestion = (assignment: Assignment) => {
    return assignment.isSuggested && (!assignment.suggestionStatus || assignment.suggestionStatus === 'pending')
  }

  const pendingSuggestions = useMemo(
    () => assignments.filter((assignment) => isPendingSuggestion(assignment)),
    [assignments]
  )

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => !isPendingSuggestion(assignment) && assignment.suggestionStatus !== 'declined'),
    [assignments]
  )

  const visibleAssignments = assignmentFilter === 'pending' ? pendingSuggestions : activeAssignments

  const grouped = useMemo(() => {
    const groups: Record<string, Assignment[]> = { Overdue: [], Today: [], Upcoming: [] }
    visibleAssignments.forEach(a => { groups[categorize(a.dueAt)].push(a) })
    return groups
  }, [visibleAssignments])

  const stats = useMemo(() => {
    const total = visibleAssignments.length
    let overdue = 0
    let dueToday = 0
    let upcoming = 0
    visibleAssignments.forEach(a => {
      const bucket = categorize(a.dueAt)
      if (bucket === 'Overdue') overdue++
      if (bucket === 'Today') dueToday++
      if (bucket === 'Upcoming') upcoming++
    })
    return { total, overdue, dueToday, upcoming }
  }, [visibleAssignments])

  const classById = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])), [classes])

  const addAssignment = async (input: AssignmentInput) => {
    if (!studentId) {
      console.error("Assignments: missing student id, cannot create assignment.")
      setLoadError("Unable to create assignment right now.")
      return
    }

    const dueAt = input.dueDate ? new Date(`${input.dueDate}T00:00:00`).toISOString() : null
    let creatorId = currentProfileId
    let role = currentRole

    if (!creatorId || !role) {
      const { user, profile } = await getCurrentProfile()
      creatorId = profile?.id ?? null
      role = profile?.role ?? null
      setCurrentUserId(user?.id ?? null)
      setCurrentProfileId(creatorId)
      setCurrentRole(role)
    }

    if (!currentUserId && !creatorId) {
      setLoadError("Unable to identify the current user.")
      return
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        student_id: studentId,
        course_id: input.classId && input.classId !== 'none' ? input.classId : null,
        title: input.title,
        description: input.notes ?? null,
        type: input.type,
        due_at: dueAt,
        status: 'todo',
        created_by: creatorId ?? null,
        created_by_role: role ?? null,
        source: resolveSource(role),
      })
      .select('id, title, type, description, due_at, status, completed_at, priority, course_id, source, created_by_role, is_suggested, suggestion_status, course:courses (title, teacher_name)')
      .single()

    if (error) {
      console.error("Assignments: failed to create assignment", error)
      setLoadError("Unable to create assignment right now.")
      return
    }

    const basePts = computePotentialPoints(input.dueDate)
    const course = Array.isArray(data?.course) ? data?.course[0] : data?.course
    const nextAssignment: Assignment = {
      id: data.id,
      title: data.title ?? input.title,
      type: normalizeAssignmentType(data.type ?? input.type),
      classId: data.course_id ?? input.classId,
      dueAt: data.due_at,
      notes: data.description ?? input.notes ?? null,
      status: data.status,
      completedAt: data.completed_at,
      courseTitle: course?.title ?? null,
      courseTeacher: course?.teacher_name ?? null,
      priority: data.priority ?? null,
      source: data.source ?? null,
      createdByRole: data.created_by_role ?? null,
      isSuggested: data.is_suggested ?? false,
      suggestionStatus: data.suggestion_status ?? null,
      pointsAvailable: basePts,
    }

    setAssignments(prev => [...prev, nextAssignment])
  }

  function computePotentialPoints(dueIso: string | null) {
    if (!dueIso) return 0
    const today = startOfDay(new Date())
    const due = startOfDay(new Date(dueIso))
    return due < today ? 0 : 10
  }

  async function updateCompletion(a: Assignment, shouldComplete: boolean) {
    if (!studentId) {
      console.error("Assignments: missing student id, cannot update completion.")
      return
    }
    setUpdatingId(a.id)

    const nextStatus = shouldComplete ? 'done' : 'todo'
    const nextCompletedAt = shouldComplete ? new Date().toISOString() : null

    const { error } = await supabase
      .from('assignments')
      .update({ status: nextStatus, completed_at: nextCompletedAt })
      .eq('id', a.id)

    if (error) {
      setLoadError(error.message)
      setUpdatingId(null)
      return
    }

    const earned = a.pointsAvailable ?? computePotentialPoints(a.dueAt)
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: nextStatus, completedAt: nextCompletedAt, pointsEarned: shouldComplete ? earned : undefined } : x))
    if (shouldComplete) {
      setCongratsPoints(earned)
      setCongratsOpen(true)
    }
    setUpdatingId(null)
  }

  const itemLeftBar = (cat: string) => {
    switch (cat) {
      case 'Overdue': return 'before:bg-red-400/80'
      case 'Today': return 'before:bg-amber-400/80'
      case 'Upcoming': return 'before:bg-blue-400/80'
      default: return 'before:bg-slate-300/80'
    }
  }

  const groupShade = (cat: string) => {
    switch (cat) {
      case 'Overdue': return 'bg-red-50/50'
      case 'Today': return 'bg-amber-50/50'
      case 'Upcoming': return 'bg-indigo-50/40'
      default: return 'bg-slate-50/40'
    }
  }

  const fetchScheduleHints = async () => {
    if (!studentId) return []
    const { data, error } = await supabase
      .from('calendar_events')
      .select('title, start_at, end_at')
      .eq('student_id', studentId)
    if (error) {
      return []
    }
    return (data ?? []).map((event) => ({
      title: event.title,
      date: event.start_at?.split('T')?.[0],
      start_time: event.start_at?.split('T')?.[1]?.slice(0, 5),
      end_time: event.end_at?.split('T')?.[1]?.slice(0, 5),
    }))
  }

  const handleGenerateStudyPlan = async (assignment: Assignment) => {
    if (!assignment.dueAt || !studentId) {
      setLoadError('Select a dated assignment to generate a plan.')
      return
    }

    setStudyPlanLoading(true)
    setStudyPlanAssignment(assignment)
    setStudyPlanMilestones([])
    setStudyPlanId(null)

    const schedule = await fetchScheduleHints()
    const response = await fetch('/api/generate-study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: assignment.title,
        dueDate: assignment.dueAt,
        schedule,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      setStudyPlanLoading(false)
      setLoadError(payload?.error ?? 'Unable to generate a study plan.')
      return
    }

    const milestones = Array.isArray(payload?.milestones) ? payload.milestones : []
    setStudyPlanMilestones(milestones)

    const { data, error } = await supabase
      .from('ai_study_plans')
      .insert({
        student_id: studentId,
        target_assignment_id: assignment.id,
        target_title: assignment.title,
        target_due_at: assignment.dueAt,
        proposed_milestones: milestones,
        status: 'proposed',
      })
      .select('id')
      .single()

    if (!error && data?.id) {
      setStudyPlanId(data.id)
    }

    setStudyPlanOpen(true)
    setStudyPlanLoading(false)
  }

  const handleAcceptStudyPlan = async () => {
    if (!studentId || !studyPlanAssignment) return
    if (studyPlanMilestones.length === 0) return

    setStudyPlanLoading(true)
    const baseDate = (date: string, time: string) => new Date(`${date}T${time}`).toISOString()
    const rows = studyPlanMilestones.map((milestone) => {
      const startTime = milestone.start_time || '18:00'
      const duration = milestone.duration_minutes || 60
      const endDate = new Date(`${milestone.date}T${startTime}`)
      endDate.setMinutes(endDate.getMinutes() + duration)
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
      return {
        student_id: studentId,
        title: milestone.title,
        description: `Study plan for ${studyPlanAssignment.title}`,
        event_type: 'study_block',
        start_at: baseDate(milestone.date, startTime),
        end_at: baseDate(milestone.date, endTime),
        all_day: false,
        is_private: false,
        source: 'ai',
        created_by: currentProfileId,
      }
    })

    const { error } = await supabase.from('calendar_events').insert(rows)
    if (error) {
      setLoadError(error.message)
      setStudyPlanLoading(false)
      return
    }

    if (studyPlanId) {
      await supabase
        .from('ai_study_plans')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', studyPlanId)
    }

    setStudyPlanOpen(false)
    setStudyPlanLoading(false)
  }

  const renderAssignment = (a: Assignment) => {
    const meta = typeMeta[a.type]
    const Icon = meta.icon
    const cls = classById[a.classId]
    const cat = categorize(a.dueAt)
    const isCompleted = a.status === 'done' || a.status === 'completed' || Boolean(a.completedAt)
    const isPending = isPendingSuggestion(a)
    const isStudyEligible = a.type === 'test' || a.type === 'project'
    const statusBadge = (() => {
      if (cat === 'Overdue') return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
      if (cat === 'Today') return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Today</Badge>
      if (!a.dueAt) return <Badge className="bg-blue-50 text-blue-700 border-blue-200">No due date</Badge>
      const chip = formatMonthDay(a.dueAt)
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{chip}</Badge>
    })()
    const potential = a.pointsAvailable ?? computePotentialPoints(a.dueAt)
    const sourceLabel = resolveSourceLabel(a.source, a.createdByRole)
    return (
      <div
        key={a.id}
        className={
          `group relative pl-4 p-5 rounded-2xl border border-gray-100 bg-white/70 shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 ` +
          `${isPending ? 'border-amber-200 bg-amber-50/70' : ''} ` +
          `before:content-[''] before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1.5 before:rounded-full ${itemLeftBar(cat)}`
        }
      >
        {/* Points badge in corner */}
        <div className="absolute top-3 right-3">
          {isCompleted ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              +{a.pointsEarned ?? 0} pts
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">+{potential} pts</Badge>
          )}
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-grid-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-grid-2 mb-1">
                <Badge className={`${meta.badge} text-xs font-medium flex items-center`}>
                  <Icon className={`w-3.5 h-3.5 mr-1 ${meta.color}`} />
                  {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                </Badge>
                {statusBadge}
                {isPending && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                    Pending suggestion
                  </Badge>
                )}
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                  {sourceLabel}
                </Badge>
              </div>
              <div className="font-semibold text-gray-900 leading-tight mt-1">{a.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cls?.color ?? 'bg-gray-300'}`} />
                  {cls?.name ?? a.courseTitle ?? 'Class'}
                </div>
                <div className="flex items-center space-grid-3 text-xs text-gray-600 mt-2">
                  <div className="flex items-center space-grid">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : 'No due date'}
                    </span>
                  </div>
                  {a.notes && <div className="text-gray-600 truncate bg-gray-100/70 px-3 py-1 rounded-lg">{a.notes}</div>}
                </div>
                {isPending ? (
                  <div className="mt-3 text-xs text-amber-700">
                    Respond on your dashboard to accept or decline.
                  </div>
                ) : !isCompleted ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl bg-gradient-primary text-white btn-glow"
                      onClick={() => updateCompletion(a, true)}
                      disabled={updatingId === a.id}
                    >
                      <Trophy className="w-4 h-4 mr-2" /> Mark Complete
                    </Button>
                    {isStudyEligible && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => handleGenerateStudyPlan(a)}
                        disabled={studyPlanLoading}
                      >
                        <Sparkles className="w-4 h-4 mr-2" /> Create Study Plan
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => updateCompletion(a, false)}
                      disabled={updatingId === a.id}
                    >
                      Mark Incomplete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          <div className="flex items-center space-grid-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="p-2 h-auto rounded-xl hover:bg-gray-100"><ExternalLink className="w-4 h-4 text-gray-600" /></Button>
            <Button variant="ghost" size="sm" className="p-2 h-auto rounded-xl hover:bg-gray-100"><Copy className="w-4 h-4 text-gray-600" /></Button>
            <Button variant="ghost" size="sm" className="p-2 h-auto rounded-xl hover:bg-gray-100"><Edit className="w-4 h-4 text-gray-600" /></Button>
            <Button variant="ghost" size="sm" className="p-2 h-auto rounded-xl hover:bg-gray-100"><Trash2 className="w-4 h-4 text-red-600" /></Button>
          </div>
        </div>
      </div>
    )
  }

  const groupsOrder: Array<keyof typeof grouped> = ['Overdue', 'Today', 'Upcoming']

  return (
    <div className="p-4 md:p-6 lg:p-8 space-grid-6">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <p className="text-gray-600">Manage your assignments and track due dates</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={assignmentFilter === 'active' ? 'default' : 'outline'}
            className={assignmentFilter === 'active' ? 'rounded-full bg-gradient-primary text-white' : 'rounded-full'}
            onClick={() => setAssignmentFilter('active')}
          >
            Active ({activeAssignments.length})
          </Button>
          <Button
            size="sm"
            variant={assignmentFilter === 'pending' ? 'default' : 'outline'}
            className={assignmentFilter === 'pending' ? 'rounded-full bg-amber-500 text-white' : 'rounded-full'}
            onClick={() => setAssignmentFilter('pending')}
          >
            Pending Suggestions ({pendingSuggestions.length})
          </Button>
        </div>
      </div>
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading assignments...</p>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Assignments grouped */}
        <div className="lg:col-span-2 space-grid-6">
          {groupsOrder.map(key => (
            <Card key={key} className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-grid-2">
                  <div className="w-8 h-8 bg-white/50 rounded-xl flex items-center justify-center shadow-md">
                    {key === 'Overdue' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  {key}
                  <Badge className="ml-2 bg-gray-100 text-gray-700 border-gray-200">{grouped[key].length}</Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(prev => ({ ...prev, [key]: !prev[key as string] }))}
                  className="rounded-xl hover:bg-gray-100"
                  aria-label={open[key as string] ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${open[key as string] ? '' : '-rotate-90'}`} />
                </Button>
              </CardHeader>
              <CardContent className={`space-grid-3 ${groupShade(key)} rounded-2xl p-4 ${open[key as string] ? '' : 'hidden'}` }>
                {grouped[key].length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-sm bg-white/40">No assignments</div>
                ) : (
                  grouped[key].map(renderAssignment)
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: Actions + Stats */}
        <div className="space-grid-6">
          {/* Add Assignment card */}
          <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Add Assignment</h3>
              <p className="text-gray-600 mb-4">Create a new assignment with due date and class information</p>
              <Button
                onClick={() => setIsOpen(true)}
                className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
                disabled={!studentId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Assignment
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats card */}
          <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
                <div className="text-gray-600 text-sm">Total Assignments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-amber-600">{stats.dueToday}</div>
                <div className="text-amber-600 text-sm">Due Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-red-600">{stats.overdue}</div>
                <div className="text-red-600 text-sm">Overdue</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssignmentModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={addAssignment} classes={classes} />
      <GamificationCongratsModal
        open={congratsOpen}
        onClose={() => setCongratsOpen(false)}
        pointsEarned={congratsPoints}
        streakDays={12}
        unlockedBadges={congratsPoints >= 10 ? ['On-Time Hero'] : []}
        onViewBadges={() => {
          setCongratsOpen(false)
          // Navigation is handled via sidebar; leaving as placeholder CTA
        }}
      />
      <StudyPlanPreview
        open={studyPlanOpen}
        onClose={() => setStudyPlanOpen(false)}
        onAccept={handleAcceptStudyPlan}
        isLoading={studyPlanLoading}
        assignmentTitle={studyPlanAssignment?.title ?? 'Study Plan'}
        dueDate={studyPlanAssignment?.dueAt ?? null}
        milestones={studyPlanMilestones}
      />
    </div>
  )
}

export default AssignmentsPage

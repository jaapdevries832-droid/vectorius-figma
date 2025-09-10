"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { DEFAULT_CLASSES, type Class } from "./WeeklyPlanner"
import { AssignmentModal, type AssignmentInput, type AssignmentType } from "./AssignmentModal"
import { BookOpen, HelpCircle, ClipboardCheck, Briefcase, Calendar, CalendarDays, AlertCircle, Clock, Edit, Trash2, Plus, ExternalLink, Copy, ChevronDown } from "lucide-react"

type Assignment = AssignmentInput & { id: string }

const typeMeta: Record<AssignmentType, { icon: any; color: string; badge: string }> = {
  homework: { icon: BookOpen, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  quiz: { icon: HelpCircle, color: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  test: { icon: ClipboardCheck, color: 'text-green-600', badge: 'bg-green-100 text-green-700 border-green-200' },
  project: { icon: Briefcase, color: 'text-pink-600', badge: 'bg-pink-100 text-pink-700 border-pink-200' },
}

function formatMonthDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfDay(d: Date) { const nd = new Date(d); nd.setHours(0,0,0,0); return nd }
function endOfDay(d: Date) { const nd = new Date(d); nd.setHours(23,59,59,999); return nd }

function categorize(dueIso: string) {
  const today = startOfDay(new Date())
  const due = startOfDay(new Date(dueIso))
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + 7)
  if (due < today) return 'Overdue'
  if (isSameDate(due, today)) return 'Due Today'
  if (isSameDate(due, tomorrow)) return 'Due Tomorrow'
  if (due <= endOfWeek) return 'This Week'
  return 'Later'
}

export function AssignmentsPage({ classes = DEFAULT_CLASSES }: { classes?: Class[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    Overdue: true,
    'Due Today': true,
    'Due Tomorrow': true,
    'This Week': true,
    Later: true,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: 'a1', title: 'Chapter 7 Homework', type: 'homework', classId: classes[0]?.id ?? '', dueDate: new Date().toISOString().split('T')[0] },
    { id: 'a2', title: 'Lab Safety Quiz', type: 'quiz', classId: classes[1]?.id ?? '', dueDate: (()=>{ const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] })() },
    { id: 'a3', title: 'Poetry Analysis', type: 'project', classId: classes[2]?.id ?? '', dueDate: (()=>{ const d=new Date(); d.setDate(d.getDate()+3); return d.toISOString().split('T')[0] })(), notes: 'Focus on imagery.' },
    { id: 'a4', title: 'Midterm Test', type: 'test', classId: classes[3]?.id ?? classes[0]?.id ?? '', dueDate: (()=>{ const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0] })() },
  ])

  const grouped = useMemo(() => {
    const groups: Record<string, Assignment[]> = { Overdue: [], 'Due Today': [], 'Due Tomorrow': [], 'This Week': [], Later: [] }
    assignments.forEach(a => { groups[categorize(a.dueDate)].push(a) })
    return groups
  }, [assignments])

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const endWeek = new Date(today); endWeek.setDate(today.getDate() + 7)
    let total = assignments.length, overdue = 0, dueThisWeek = 0
    assignments.forEach(a => {
      const due = startOfDay(new Date(a.dueDate))
      if (due < today) overdue++
      if (due >= today && due <= endWeek) dueThisWeek++
    })
    return { total, overdue, dueThisWeek }
  }, [assignments])

  const classById = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])), [classes])

  const addAssignment = (input: AssignmentInput) => {
    setAssignments(prev => [...prev, { id: Date.now().toString(), ...input }])
    setIsOpen(false)
  }

  const itemLeftBar = (cat: string) => {
    switch (cat) {
      case 'Overdue': return 'before:bg-red-400/80'
      case 'Due Today': return 'before:bg-amber-400/80'
      case 'Due Tomorrow': return 'before:bg-yellow-400/80'
      case 'This Week': return 'before:bg-blue-400/80'
      default: return 'before:bg-slate-300/80'
    }
  }

  const groupShade = (cat: string) => {
    switch (cat) {
      case 'Overdue': return 'bg-red-50/50'
      case 'Due Today': return 'bg-amber-50/50'
      case 'Due Tomorrow': return 'bg-yellow-50/50'
      case 'This Week': return 'bg-indigo-50/50'
      default: return 'bg-slate-50/40'
    }
  }

  const renderAssignment = (a: Assignment) => {
    const meta = typeMeta[a.type]
    const Icon = meta.icon
    const cls = classById[a.classId]
    const cat = categorize(a.dueDate)
    const statusBadge = (() => {
      if (cat === 'Overdue') return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
      if (cat === 'Due Today') return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Today</Badge>
      if (cat === 'Due Tomorrow') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Tomorrow</Badge>
      const chip = formatMonthDay(a.dueDate)
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{chip}</Badge>
    })()
    return (
      <div
        key={a.id}
        className={
          `group relative pl-4 p-5 rounded-2xl border border-gray-100 bg-white/70 shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 ` +
          `before:content-[''] before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1.5 before:rounded-full ${itemLeftBar(cat)}`
        }
      >
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
              </div>
              <div className="font-semibold text-gray-900 leading-tight mt-1">{a.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cls?.color ?? 'bg-gray-300'}`} />
                {cls?.name ?? 'Class'}
              </div>
              <div className="flex items-center space-grid-3 text-xs text-gray-600 mt-2">
                <div className="flex items-center space-grid">
                  <Calendar className="w-3 h-3" />
                  <span>Due {new Date(a.dueDate).toLocaleDateString()}</span>
                </div>
                {a.notes && <div className="text-gray-600 truncate bg-gray-100/70 px-3 py-1 rounded-lg">{a.notes}</div>}
              </div>
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

  const groupsOrder: Array<keyof typeof grouped> = ['Overdue', 'Due Today', 'Due Tomorrow', 'This Week', 'Later']

  return (
    <div className="p-4 md:p-6 lg:p-8 space-grid-6">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <p className="text-gray-600">Manage your assignments and track due dates</p>
      </div>
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
              <Button onClick={() => setIsOpen(true)} className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow">
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
                <div className="text-2xl font-semibold text-red-600">{stats.dueThisWeek}</div>
                <div className="text-red-600 text-sm">Due This Week</div>
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
    </div>
  )
}

export default AssignmentsPage

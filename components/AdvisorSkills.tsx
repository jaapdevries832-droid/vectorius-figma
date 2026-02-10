"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Search, Plus, Edit, Trash2, Send, Users, Brain, ClipboardCheck } from 'lucide-react'
import type { SkillModule } from 'app/lib/types'
import type { Student } from 'app/lib/domain'
import { DEFAULT_SKILL_MODULES } from 'app/lib/skills-data'
import { supabase } from '@/lib/supabase/client'

type AdvisorNotification = {
  id: string
  studentId: string
  studentName: string
  moduleId: string
  moduleTitle?: string
  completedAt: string
  feedback?: string
  readAt?: string
}

export function AdvisorSkills() {
  const [modules, setModules] = useState<SkillModule[]>([])
  const [notifications, setNotifications] = useState<AdvisorNotification[]>([])
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [openAssign, setOpenAssign] = useState(false)
  const [selectedModule, setSelectedModule] = useState<SkillModule | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [advisorId, setAdvisorId] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    let isMounted = true
    const loadNotifications = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        console.error('Failed to load user for notifications', userError)
        return
      }

      const { data, error } = await supabase
        .from('mentor_notifications')
        .select(`
          id,
          student_id,
          skill_assignment_id,
          message,
          created_at,
          read_at,
          students!inner(first_name, last_name),
          skill_assignments!inner(skill_module_id)
        `)
        .eq('mentor_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (!isMounted) return
      if (error) {
        console.error('Failed to load notifications', error)
        return
      }

      const normalized = (data ?? []).map((row) => {
        const studentsData = row.students
        const skillAssignmentsData = row.skill_assignments
        const firstName = studentsData && typeof studentsData === 'object' && 'first_name' in studentsData ? studentsData.first_name : ''
        const lastName = studentsData && typeof studentsData === 'object' && 'last_name' in studentsData ? studentsData.last_name : ''
        const skillModuleId = skillAssignmentsData && typeof skillAssignmentsData === 'object' && 'skill_module_id' in skillAssignmentsData ? skillAssignmentsData.skill_module_id : ''

        return {
          id: row.id,
          studentId: row.student_id,
          studentName: [firstName, lastName].filter(Boolean).join(' ') || 'Unknown',
          moduleId: String(skillModuleId),
          moduleTitle: row.message.split(' completed ')[1] || 'Skill Module',
          completedAt: row.created_at,
          readAt: row.read_at
        }
      }) as AdvisorNotification[]

      setNotifications(normalized)
    }

    loadNotifications()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadAdvisorStudents = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        console.error('Failed to load mentor profile for skill assignments', userError)
        return
      }

      if (!isMounted) return
      setAdvisorId(userData.user.id)

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email')
        .eq('advisor_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (!isMounted) return
      if (error) {
        console.error('Failed to load students for skill assignments', error)
        return
      }

      const normalized = (data ?? []).map((row) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email ?? '',
        role: 'student'
      })) as Student[]

      setStudents(normalized)
    }

    loadAdvisorStudents()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadModules = async () => {
      const { data, error } = await supabase
        .from('skill_modules')
        .select('id, title, description, objectives, media, duration, difficulty, topic')
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (!isMounted) return
      if (error) {
        console.error('Failed to load skill modules', error)
        setModules(DEFAULT_SKILL_MODULES)
        return
      }

      const normalized = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        objectives: row.objectives ?? [],
        media: Array.isArray(row.media) ? row.media : [],
        duration: row.duration ?? undefined,
        difficulty: row.difficulty ?? undefined,
        topic: row.topic ?? undefined
      })) as SkillModule[]

      setModules(normalized)
    }

    loadModules()

    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    return modules.filter(m =>
      (!query || m.title.toLowerCase().includes(query.toLowerCase()) || m.description.toLowerCase().includes(query.toLowerCase())) &&
      (topicFilter === 'all' || m.topic === topicFilter)
    )
  }, [modules, query, topicFilter])

  function logReadOnly(action: string) {
    console.error(`Skill modules are read-only in this view; ${action} is disabled.`)
  }

  function openAssignModal(m: SkillModule) {
    setSelectedModule(m)
    setSelectedStudents([])
    setNotes('')
    setOpenAssign(true)
  }
  function toggleStudent(id: string) {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  async function confirmAssign() {
    if (!selectedModule || selectedStudents.length === 0) return
    if (!advisorId) {
      console.error('Cannot assign skill modules without a mentor profile')
      return
    }

    const payload = selectedStudents.map((studentId) => ({
      skill_module_id: selectedModule.id,
      student_id: studentId,
      assigned_by: advisorId,
      assigned_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('skill_assignments')
      .insert(payload)

    if (error) {
      console.error('Failed to assign skill modules', error)
      return
    }

    setOpenAssign(false)
    setSelectedStudents([])
    setNotes('')
  }

  return (
    <div className="space-grid-6">
      {/* Header + controls */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-green-600" /> Skill Modules
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search modules..." value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-64" />
            </div>
            <Select value={topicFilter} onValueChange={(v)=>setTopicFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All topics" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={'all'}>All topics</SelectItem>
                <SelectItem value="note-taking">Note-taking</SelectItem>
                <SelectItem value="test-prep">Test prep</SelectItem>
                <SelectItem value="time-management">Time mgmt</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-green-600 hover:bg-green-700 rounded-xl" onClick={() => logReadOnly('adding modules')}><Plus className="w-4 h-4 mr-2" />New Module</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(m => (
              <Card key={m.id} className="rounded-2xl border-0 shadow-md bg-white">
                <CardHeader>
                  <CardTitle className="text-base">{m.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-grid-3">
                  <p className="text-sm text-gray-700 line-clamp-3">{m.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">{m.duration || '10–20 min'}</Badge>
                    {m.difficulty && <Badge className="bg-blue-100 text-blue-700 border-blue-200 capitalize">{m.difficulty}</Badge>}
                    {m.topic && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{m.topic}</Badge>}
                  </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openAssignModal(m)}><Users className="w-4 h-4 mr-1" />Assign</Button>
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => logReadOnly('removing modules')}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => logReadOnly('editing modules')}><Edit className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Completion notifications from students */}
      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-indigo-600" /> Completions & Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-grid-4">
          {notifications.length === 0 ? (
            <div className="text-sm text-gray-600">No new completions yet.</div>
          ) : notifications.map((n, idx) => (
            <div key={idx} className="p-4 bg-white rounded-2xl border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{n.studentName} completed {n.moduleTitle}</div>
                  <div className="text-xs text-gray-600">{new Date(n.completedAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-3">
                <Textarea
                  placeholder="Add feedback to discuss in next session..."
                  defaultValue={n.feedback || ''}
                  onBlur={async (e)=>{
                    const msg = e.currentTarget.value
                    if (!msg) return

                    // Mark notification as read when feedback is added
                    if (!n.readAt) {
                      const { error } = await supabase
                        .from('mentor_notifications')
                        .update({ read_at: new Date().toISOString() })
                        .eq('id', n.id)

                      if (error) {
                        console.error('Failed to mark notification as read', error)
                      } else {
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
                      }
                    }

                    // Update local state with feedback
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, feedback: msg } : x))
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Assign modal */}
      <Dialog open={openAssign} onOpenChange={setOpenAssign}>
        <DialogContent className="rounded-2xl border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle>Assign Module</DialogTitle>
          </DialogHeader>
          <div className="space-grid-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-600">Module</div>
              <div className="font-medium text-gray-900">{selectedModule?.title}</div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Select students</div>
              <div className="grid grid-cols-2 gap-2">
                {students.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${selectedStudents.includes(s.id) ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Instructions (optional)</div>
              <Textarea placeholder="Add guidance or focus areas..." value={notes} onChange={(e)=>setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={()=>setOpenAssign(false)}>Cancel</Button>
              <Button className="rounded-xl bg-gradient-primary text-white btn-glow" onClick={confirmAssign}><Send className="w-4 h-4 mr-1" /> Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdvisorSkills

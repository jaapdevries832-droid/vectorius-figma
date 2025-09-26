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
import type { SkillModule, AssignedSkill } from 'app/lib/types'
import { DEFAULT_SKILL_MODULES } from 'app/lib/skills-data'

type Student = { id: string; name: string }

const STORAGE_KEYS = {
  modules: 'skillModules',
  assignments: 'assignedSkills',
  notifications: 'mentorNotifications'
}

function loadModules(): SkillModule[] {
  if (typeof window === 'undefined') return DEFAULT_SKILL_MODULES
  const raw = localStorage.getItem(STORAGE_KEYS.modules)
  if (!raw) return DEFAULT_SKILL_MODULES
  try { return JSON.parse(raw) } catch { return DEFAULT_SKILL_MODULES }
}
function saveModules(mods: SkillModule[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.modules, JSON.stringify(mods))
}
function loadAssignments(): AssignedSkill[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS.assignments)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}
function saveAssignments(asg: AssignedSkill[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(asg))
}
function loadNotifications(): any[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS.notifications)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}
function saveNotifications(items: any[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(items))
}

export function MentorSkills() {
  const [modules, setModules] = useState<SkillModule[]>(DEFAULT_SKILL_MODULES)
  const [assignments, setAssignments] = useState<AssignedSkill[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [openAssign, setOpenAssign] = useState(false)
  const [selectedModule, setSelectedModule] = useState<SkillModule | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const students: Student[] = [
    { id: '1', name: 'Jordan Davis' },
    { id: '2', name: 'Taylor Davis' },
    { id: '3', name: 'Alex Johnson' },
    { id: '4', name: 'Sam Wilson' },
  ]

  useEffect(() => {
    setModules(loadModules())
    setAssignments(loadAssignments())
    setNotifications(loadNotifications())
  }, [])

  useEffect(() => { saveModules(modules) }, [modules])
  useEffect(() => { saveAssignments(assignments) }, [assignments])
  useEffect(() => { saveNotifications(notifications) }, [notifications])

  const filtered = useMemo(() => {
    return modules.filter(m =>
      (!query || m.title.toLowerCase().includes(query.toLowerCase()) || m.description.toLowerCase().includes(query.toLowerCase())) &&
      (topicFilter === 'all' || m.topic === topicFilter)
    )
  }, [modules, query, topicFilter])

  function addModule() {
    const newMod: SkillModule = {
      id: `skill-${Date.now()}`,
      title: 'New Skill Module',
      description: 'Describe learning objectives and resources.',
      objectives: ['Objective 1'],
      media: [],
      duration: '10–20 min',
      difficulty: 'beginner',
      topic: 'general'
    }
    setModules(prev => [newMod, ...prev])
  }
  function removeModule(id: string) {
    setModules(prev => prev.filter(m => m.id !== id))
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
  function confirmAssign() {
    if (!selectedModule || selectedStudents.length === 0) return
    const created: AssignedSkill[] = selectedStudents.map(sid => ({
      id: `asg-${Date.now()}-${sid}`,
      moduleId: selectedModule.id,
      studentId: sid,
      notes,
      status: 'not_started',
      assignedAt: new Date().toISOString(),
    }))
    setAssignments(prev => [...created, ...prev])
    setOpenAssign(false)
    // Notification to student simulated via localStorage; student dashboard reads assignments
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
            <Button className="bg-green-600 hover:bg-green-700 rounded-xl" onClick={addModule}><Plus className="w-4 h-4 mr-2" />New Module</Button>
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
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => removeModule(m.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => {
                      const nextTitle = window.prompt('Edit title', m.title) ?? m.title
                      const nextDesc = window.prompt('Edit description', m.description) ?? m.description
                      setModules(prev => prev.map(x => x.id === m.id ? { ...x, title: nextTitle, description: nextDesc } : x))
                    }}><Edit className="w-4 h-4" /></Button>
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
                <Textarea placeholder="Add feedback to discuss in next session..." onBlur={(e)=>{
                  const msg = e.currentTarget.value
                  if (!msg) return
                  setNotifications(prev => prev.map((x,i)=> i===idx ? { ...x, feedback: msg } : x))
                }} />
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

export default MentorSkills

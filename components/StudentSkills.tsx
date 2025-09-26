"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Play, ExternalLink, CheckCircle, BookOpen, Trophy } from 'lucide-react'
import type { SkillModule, AssignedSkill } from 'app/lib/types'

const STORAGE_KEYS = {
  modules: 'skillModules',
  assignments: 'assignedSkills',
  notifications: 'mentorNotifications'
}

function loadModules(): SkillModule[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS.modules)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
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
function pushNotification(n: any) {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEYS.notifications)
  const arr = raw ? (()=>{ try { return JSON.parse(raw) } catch { return [] } })() : []
  arr.unshift(n)
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(arr))
}

export function StudentSkills() {
  const studentId = '1' // demo: Jordan Davis
  const [mods, setMods] = useState<SkillModule[]>([])
  const [assignments, setAssignments] = useState<AssignedSkill[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    setMods(loadModules())
    setAssignments(loadAssignments())
  }, [])

  const mine = useMemo(() => assignments.filter(a => a.studentId === studentId), [assignments])
  const current = useMemo(() => {
    if (!activeId) return null
    const asg = mine.find(a => a.id === activeId)
    const mod = mods.find(m => m.id === asg?.moduleId)
    return asg && mod ? { asg, mod } : null
  }, [activeId, mine, mods])

  function startModule(a: AssignedSkill) {
    setAssignments(prev => {
      const next: AssignedSkill[] = prev.map(x =>
        x.id === a.id ? { ...x, status: "in_progress" } : x
      )
      saveAssignments(next)
      return next
    })
    setActiveId(a.id)
  }
  function completeModule(a: AssignedSkill) {
    const completedAt = new Date().toISOString()
    setAssignments(prev => {
      const next: AssignedSkill[] = prev.map(x =>
        x.id === a.id ? { ...x, status: "completed", completedAt } : x
      )
      saveAssignments(next)
      return next
    })
    // Notify mentor
    const mod = mods.find(m => m.id === a.moduleId)
    pushNotification({ studentId, studentName: 'Jordan Davis', moduleId: a.moduleId, moduleTitle: mod?.title, completedAt })
    alert('Great job! You earned +20 points for completing a skill module.')
  }

  return (
    <div className="space-grid-6">
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-green-600" /> Learn How to Learn</CardTitle>
        </CardHeader>
        <CardContent className="space-grid-4">
          {mine.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border text-gray-600">No modules assigned yet. When your mentor assigns one, it will appear here.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-grid-3">
                {mine.map(a => {
                  const m = mods.find(mm => mm.id === a.moduleId)
                  return (
                    <div key={a.id} className={`p-4 rounded-2xl border bg-white hover:shadow cursor-pointer ${activeId === a.id ? 'ring-2 ring-blue-400' : ''}`} onClick={()=>setActiveId(a.id)}>
                      <div className="font-medium text-gray-900">{m?.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{m?.description}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200">{m?.duration || '10–20 min'}</Badge>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 capitalize">{a.status.replace('_',' ')}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="lg:col-span-2">
                {!current ? (
                  <div className="p-6 rounded-2xl bg-white border text-gray-600">Select a module to view details.</div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white border space-grid-4">
                    <div>
                      <div className="text-xl font-semibold text-gray-900">{current.mod.title}</div>
                      <p className="text-gray-700 mt-1">{current.mod.description}</p>
                    </div>
                    {current.mod.objectives && (
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">Objectives</div>
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {current.mod.objectives.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                    {current.mod.media && current.mod.media.length > 0 && (
                      <div className="space-grid-2">
                        <div className="text-sm font-medium text-gray-900">Resources</div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {current.mod.media.map((res, i) => (
                            <a key={i} href={res.url} target="_blank" className="p-3 rounded-xl border bg-gray-50 hover:bg-gray-100 inline-flex items-center gap-2 text-sm text-gray-700">
                              {res.type === 'video' ? <Play className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                              <span className="truncate">{res.title || res.url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600">Complete the module to earn a small reward</div>
                      {current.asg.status !== 'completed' ? (
                        <div className="flex gap-2">
                          {current.asg.status === 'not_started' && (
                            <Button className="rounded-xl" onClick={()=>startModule(current.asg)}>Start</Button>
                          )}
                          <Button className="rounded-xl bg-gradient-primary text-white btn-glow" onClick={()=>completeModule(current.asg)}>
                            <Trophy className="w-4 h-4 mr-1" /> Mark Completed
                          </Button>
                        </div>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Completed</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default StudentSkills

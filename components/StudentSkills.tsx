"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Play, ExternalLink, CheckCircle, BookOpen, Trophy } from 'lucide-react'
import type { SkillModule, AssignedSkill } from 'app/lib/types'
import { supabase } from '@/lib/supabase/client'


export function StudentSkills() {
  const [mods, setMods] = useState<SkillModule[]>([])
  const [assignments, setAssignments] = useState<AssignedSkill[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('Student')
  const [advisorId, setAdvisorId] = useState<string | null>(null)

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

      setMods(normalized)
    }

    loadModules()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadStudentId = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        console.error('Failed to resolve student profile', userError)
        return
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, advisor_id')
        .eq('student_user_id', userData.user.id)
        .maybeSingle()

      if (!isMounted) return
      if (error) {
        console.error('Failed to load student profile', error)
        return
      }
      if (!data) {
        console.error('Student profile missing for current user')
        return
      }

      setStudentId(data.id)
      setStudentName([data.first_name, data.last_name].filter(Boolean).join(' ') || 'Student')
      setAdvisorId(data.advisor_id)
    }

    loadStudentId()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!studentId) return
    let isMounted = true
    const loadAssignments = async () => {
      const { data, error } = await supabase
        .from('skill_assignments')
        .select('id, skill_module_id, student_id, assigned_at, completed_at')
        .eq('student_id', studentId)
        .order('assigned_at', { ascending: false })

      if (!isMounted) return
      if (error) {
        console.error('Failed to load skill assignments', error)
        return
      }

      const normalized = (data ?? []).map((row) => ({
        id: row.id,
        moduleId: row.skill_module_id,
        studentId: row.student_id,
        status: row.completed_at ? 'completed' : 'not_started',
        assignedAt: row.assigned_at,
        completedAt: row.completed_at ?? undefined
      })) as AssignedSkill[]

      setAssignments(normalized)
    }

    loadAssignments()

    return () => {
      isMounted = false
    }
  }, [studentId])

  const mine = useMemo(() => (
    studentId ? assignments.filter(a => a.studentId === studentId) : []
  ), [assignments, studentId])
  const current = useMemo(() => {
    if (!activeId) return null
    const asg = mine.find(a => a.id === activeId)
    const mod = mods.find(m => m.id === asg?.moduleId)
    return asg && mod ? { asg, mod } : null
  }, [activeId, mine, mods])

  function startModule(a: AssignedSkill) {
    if (!studentId) {
      console.error('Cannot start a module without a student profile')
      return
    }
    setAssignments(prev => {
      const next: AssignedSkill[] = prev.map(x =>
        x.id === a.id ? { ...x, status: "in_progress" } : x
      )
      return next
    })
    setActiveId(a.id)
  }
  async function completeModule(a: AssignedSkill) {
    if (!studentId) {
      console.error('Cannot complete a module without a student profile')
      return
    }
    const completedAt = new Date().toISOString()
    const { error } = await supabase
      .from('skill_assignments')
      .update({ completed_at: completedAt })
      .eq('id', a.id)

    if (error) {
      console.error('Failed to complete skill assignment', error)
      return
    }

    setAssignments(prev => {
      const next: AssignedSkill[] = prev.map(x =>
        x.id === a.id ? { ...x, status: "completed", completedAt } : x
      )
      return next
    })

    // Notify mentor via database
    if (advisorId) {
      const mod = mods.find(m => m.id === a.moduleId)
      const message = `${studentName} completed ${mod?.title || 'a skill module'}`

      const { error: notifError } = await supabase
        .from('mentor_notifications')
        .insert({
          student_id: studentId,
          mentor_id: advisorId,
          skill_assignment_id: a.id,
          message
        })

      if (notifError) {
        console.error('Failed to create mentor notification', notifError)
      }
    }

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

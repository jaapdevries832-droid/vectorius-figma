// Central types used across app UI components
export type SidebarItem =
  | 'dashboard'
  | 'assignments'
  | 'schedule'
  | 'notes'
  | 'skills'
  | 'ai-chat'
  | 'achievements'
  | 'settings'
  | 'students';

export type CurrentUser = {
  name: string
  email: string
  avatar?: string
  role: 'student' | 'parent' | 'advisor'
}

export type ClassItem = {
  id: string
  name: string
  teacher: string
  days: string[]
  startTime: string
  endTime: string
  room?: string
  color?: string
}

// Skill modules
export type SkillModule = {
  id: string
  title: string
  description: string
  objectives?: string[]
  media?: Array<{ type: 'video' | 'article' | 'exercise'; url: string; title?: string }>
  duration?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  topic?: string
}

export type AssignedSkill = {
  id: string // assignment id
  moduleId: string
  studentId: string
  notes?: string
  status: 'not_started' | 'in_progress' | 'completed'
  assignedAt: string
  completedAt?: string
}


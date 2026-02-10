export type Role = "student" | "parent" | "advisor"

export type User = {
  id: string
  role: Role
  name: string
  email: string
  avatar?: string
}

export type Student = User & {
  role: "student"
  grade?: string
  schoolYear?: string
}

export type Advisor = User & {
  role: "advisor"
  specialty?: string
}

export type Teacher = {
  id: string
  name: string
}

export type Course = {
  id: string
  name: string
  teacherName: string
}

export type ScheduledCourse = Course & {
  days: string[]
  startTime: string
  endTime: string
  room?: string
  color?: string
}

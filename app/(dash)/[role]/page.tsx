import { StudentDashboard } from '@/components/StudentDashboard'
import { ParentDashboard } from '@/components/ParentDashboard'
import { AdvisorDashboard } from '@/components/AdvisorDashboard'
import type { Role } from 'app/lib/domain'

export default function RolePage({ params }: { params: { role: Role }}) {
  if (params.role === 'student') return <StudentDashboard />
  if (params.role === 'parent') return <ParentDashboard />
  if (params.role === 'advisor') return <AdvisorDashboard />
  return <StudentDashboard />
}

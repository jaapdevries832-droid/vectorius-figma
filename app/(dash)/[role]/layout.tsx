'use client'
import { TopNavigation } from '@/components/TopNavigation'
import { Sidebar } from '@/components/Sidebar'
import { BottomNavigation } from '@/components/BottomNavigation'
import { WeeklyPlanner } from '@/components/WeeklyPlanner'
import AssignmentsPage from '@/components/AssignmentsPage'
import { ChatInterface } from '@/components/ChatInterface'
import { AchievementsPage } from '@/components/AchievementsPage'
import { MentorSkills } from '@/components/MentorSkills'
import { StudentSkills } from '@/components/StudentSkills'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RoleLayoutProvider } from 'app/lib/role-layout-context'
import type { SidebarItem } from 'app/lib/types'

export default function RoleLayout({ children, params }: { children: React.ReactNode, params: { role: 'student' | 'parent' | 'advisor' }}) {
  const router = useRouter()
  const role = params.role
  const [activeItem, setActiveItem] = useState<SidebarItem>('dashboard')
  const [openClassSetupTs, setOpenClassSetupTs] = useState(0)

  function requestOpenClassSetup() {
    setOpenClassSetupTs(Date.now())
  }

  function handleRoleChange(nextRole: 'student' | 'parent' | 'advisor') {
    if (nextRole !== role) router.push(`/${nextRole}`)
  }

  function renderContent() {
    switch (activeItem) {
      case 'dashboard':
        return children
      case 'schedule':
        return <div className="p-4"><WeeklyPlanner currentUser={null} /></div>
      case 'ai-chat':
        return <div className="p-4"><ChatInterface /></div>
      case 'assignments':
        return <div className="p-4"><AssignmentsPage /></div>
      case 'skills':
        return <div className="p-4">{role === 'advisor' ? <MentorSkills /> : <StudentSkills />}</div>
      case 'achievements':
        return <div className="p-4"><AchievementsPage /></div>
      case 'notes':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Notes</h2>
            <p className="text-muted-foreground">This is a placeholder view for Notes.</p>
          </div>
        )
      case 'students':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Students</h2>
            <p className="text-muted-foreground">Advisor-only area. Add roster and details here.</p>
          </div>
        )
      case 'settings':
        return (
          <div className="p-6 space-grid-6">
            <h2 className="text-2xl font-semibold">Settings</h2>
            <div className="grid gap-4 max-w-2xl">
              <div className="p-4 rounded-2xl bg-white border">
                <h3 className="font-medium mb-2">Notifications</h3>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Badge unlock notifications</span>
                  <input type="checkbox" className="h-5 w-5" defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Points milestone notifications</span>
                  <input type="checkbox" className="h-5 w-5" defaultChecked />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border">
                <h3 className="font-medium mb-2">Privacy</h3>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Share my streaks and badges with peers</span>
                  <input type="checkbox" className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return children
    }
  }

  return (
    <RoleLayoutProvider value={{ activeItem, setActiveItem, openClassSetupTs, requestOpenClassSetup }}>
      <div className="min-h-screen flex flex-col bg-white bg-gradient-secondary">
        <TopNavigation currentRole={role} onRoleChange={handleRoleChange} currentUser={null} onLogout={()=>{}} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar currentRole={role} activeItem={activeItem} onItemChange={setActiveItem} currentUser={null} className="hidden md:flex" />
          <main className="flex-1 overflow-y-auto">{renderContent()}</main>
        </div>
        <BottomNavigation currentRole={role} activeItem={activeItem} onItemChange={setActiveItem} />
      </div>
    </RoleLayoutProvider>
  )
}

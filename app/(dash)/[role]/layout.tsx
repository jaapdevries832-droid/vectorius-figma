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
import { NotesPage } from '@/components/NotesPage'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RoleLayoutProvider } from 'app/lib/role-layout-context'
import type { Role, User } from 'app/lib/domain'
import type { SidebarItem } from 'app/lib/types'
import { clearCurrentUser, getCurrentUser } from 'app/lib/current-user'
import { getCurrentProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase/client'
import { clearSupabaseLocalSession } from '@/lib/supabase/logout'

export default function RoleLayout({ children, params }: { children: React.ReactNode, params: { role: Role }}) {
  const router = useRouter()
  const role = params.role
  const [activeItem, setActiveItem] = useState<SidebarItem>('dashboard')
  const [openClassSetupTs, setOpenClassSetupTs] = useState(0)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  function requestOpenClassSetup() {
    setOpenClassSetupTs(Date.now())
  }

  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  useEffect(() => {
    let isMounted = true

    const verifyRole = async () => {
      const { user, profile } = await getCurrentProfile()
      if (!isMounted) return

      if (!user) {
        router.push('/login')
        return
      }

      // Build user info from profile if available
      if (profile) {
        const profileName = profile.first_name
          ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
          : user.email?.split('@')[0] ?? 'User'
        const initials = profileName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(part => part[0])
          .join('')
          .toUpperCase() || 'U'

        setCurrentUser({
          id: user.id,
          name: profileName,
          email: user.email ?? '',
          avatar: initials,
          role: profile.role as Role
        })
      }

      if (profile?.role && profile.role !== role) {
        router.push(`/${profile.role}`)
      }
    }

    verifyRole()

    return () => {
      isMounted = false
    }
  }, [role, router])

  async function handleLogout() {
    // Clear all auth state in the correct order
    // 1. Sign out from Supabase first (this invalidates the session server-side)
    await supabase.auth.signOut({ scope: 'local' })

    // 2. Clear server-side cookies via API
    await fetch('/api/auth/logout', { method: 'POST' })

    // 3. Clear all local storage auth data
    clearSupabaseLocalSession()
    clearCurrentUser()

    // 4. Clear component state
    setCurrentUser(null)

    // 5. Use window.location for a hard redirect to ensure all state is cleared
    window.location.href = '/login'
  }

  function renderContent() {
    switch (activeItem) {
      case 'dashboard':
        return children
      case 'schedule':
        return <div className="p-4"><WeeklyPlanner currentUser={currentUser} /></div>
      case 'ai-chat':
        return <div className="p-4"><ChatInterface /></div>
      case 'assignments':
        return <div className="p-4"><AssignmentsPage /></div>
      case 'skills':
        return <div className="p-4">{role === 'advisor' ? <MentorSkills /> : <StudentSkills />}</div>
      case 'achievements':
        return <div className="p-4"><AchievementsPage /></div>
      case 'notes':
        return <NotesPage role={role} />
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
                <div className="p-4 rounded-2xl bg-white border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Google Classroom</h3>
                    <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">Coming soon</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Connect your classroom to import assignments automatically.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Email Inbox Link</h3>
                    <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">Coming soon</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Link Gmail or Outlook to auto-ingest school notifications.
                  </p>
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
        <TopNavigation currentRole={role} currentUser={currentUser} onLogout={handleLogout} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar currentRole={role} activeItem={activeItem} onItemChange={setActiveItem} currentUser={currentUser} className="hidden md:flex" />
          <main className="flex-1 overflow-y-auto">{renderContent()}</main>
        </div>
        <BottomNavigation currentRole={role} activeItem={activeItem} onItemChange={setActiveItem} />
      </div>
    </RoleLayoutProvider>
  )
}

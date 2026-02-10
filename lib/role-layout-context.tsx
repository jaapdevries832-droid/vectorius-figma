"use client"

import { createContext, useContext } from "react"
import type { SidebarItem } from "@/lib/types"

type RoleLayoutContextValue = {
  activeItem: SidebarItem
  setActiveItem: (item: SidebarItem) => void
  openClassSetupTs: number
  requestOpenClassSetup: () => void
}

const RoleLayoutContext = createContext<RoleLayoutContextValue | undefined>(
  undefined
)

export function RoleLayoutProvider({
  value,
  children,
}: {
  value: RoleLayoutContextValue
  children: React.ReactNode
}) {
  return (
    <RoleLayoutContext.Provider value={value}>
      {children}
    </RoleLayoutContext.Provider>
  )
}

export function useRoleLayout() {
  const ctx = useContext(RoleLayoutContext)
  if (!ctx) {
    throw new Error("useRoleLayout must be used within a RoleLayoutProvider")
  }
  return ctx
}



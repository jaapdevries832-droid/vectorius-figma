"use client"

import React from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { 
  LayoutDashboard, 
  FileText, 
  Bot, 
  Settings,
  BookOpen,
  Users,
  Calendar,
  Award,
  Brain
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role, User } from "app/lib/domain";
import type { SidebarItem } from 'app/lib/types';
import { getCurrentProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase/client";

interface SidebarProps {
  currentRole: Role;
  activeItem: SidebarItem;
  onItemChange: (item: SidebarItem) => void;
  currentUser: User | null;
  className?: string;
}

export function Sidebar({ currentRole, activeItem, onItemChange, currentUser, className }: SidebarProps) {
  const [studentName, setStudentName] = React.useState<string | null>(null);
  const [isStudentNameLoading, setIsStudentNameLoading] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const loadStudentName = async () => {
      if (currentRole !== 'student') {
        setStudentName(null);
        setIsStudentNameLoading(false);
        return;
      }

      setIsStudentNameLoading(true);
      const { user } = await getCurrentProfile();

      if (!isMounted) return;

      if (!user) {
        setStudentName(null);
        setIsStudentNameLoading(false);
        return;
      }

      const { data: student, error } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('student_user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !student) {
        setStudentName(null);
        setIsStudentNameLoading(false);
        return;
      }

      const fullName = `${student.first_name} ${student.last_name ?? ""}`.trim();
      setStudentName(fullName || null);
      setIsStudentNameLoading(false);
    };

    loadStudentName();

    return () => {
      isMounted = false;
    };
  }, [currentRole]);

  const getMenuItems = (role: Role) => {
    // Parent-specific menu: simplified navigation
    if (role === 'parent') {
      return [
        { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, color: '#3B82F6' },
        { id: 'notes' as const, label: 'Notes', icon: BookOpen, color: '#F59E0B' },
        { id: 'settings' as const, label: 'Settings', icon: Settings, color: '#64748B' },
      ];
    }

    const baseItems: { id: SidebarItem; label: string; icon: LucideIcon; color: string }[] = [
      { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, color: '#3B82F6' },
      { id: 'schedule' as const, label: 'Schedule', icon: Calendar, color: '#8B5CF6' },
      { id: 'assignments' as const, label: 'Assignments', icon: FileText, color: '#10B981' },
      { id: 'notes' as const, label: 'Notes', icon: BookOpen, color: '#F59E0B' },
      { id: 'skills' as const, label: 'Skill Modules', icon: Brain, color: '#22C55E' },
      { id: 'ai-chat' as const, label: 'AI Chat', icon: Bot, color: '#EF4444' },
      { id: 'achievements' as const, label: 'Achievements', icon: Award, color: '#F59E0B' },
    ];

    if (role === 'advisor') {
      baseItems.splice(2, 0, { id: 'students' as const, label: 'Students', icon: Users, color: '#8B5CF6' });
    }

    return [
      ...baseItems,
      { id: 'settings' as const, label: 'Settings', icon: Settings, color: '#64748B' }
    ];
  };

  const menuItems = getMenuItems(currentRole);
  const displayName = currentRole === 'student'
    ? (isStudentNameLoading ? "Loading..." : (studentName ?? "No student profile found"))
    : (currentUser?.name || "User");

  return (
    <aside className={cn(
      "w-72 bg-white/95 backdrop-blur-lg border-r h-full flex flex-col py-8 shadow-sm",
      className
    )} style={{borderColor: 'rgba(59, 130, 246, 0.1)'}}>
      <nav className="flex-1 px-6">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start space-grid-3 h-12 px-4 rounded-2xl font-medium text-base transition-all duration-200 group",
                  isActive 
                    ? "shadow-lg btn-glow" 
                    : "hover:text-gray-900"
                )}
                style={isActive 
                  ? {background: 'var(--gradient-primary)', color: 'white'} 
                  : {color: '#374151'}
                }
                onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)')}
                onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => onItemChange(item.id)}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200",
                  isActive 
                    ? "bg-white/20" 
                    : "text-white opacity-80 group-hover:opacity-100 group-hover:scale-110"
                )}
                style={!isActive ? {backgroundColor: item.color} : {}}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="transition-all duration-200 group-hover:translate-x-1">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white/80 rounded-full animate-pulse" />
                )}
              </Button>
            );
          })}
        </div>

        {/* User Profile Section */}
        <div className="mt-8 p-4 bg-gradient-secondary rounded-2xl border" style={{borderColor: 'rgba(59, 130, 246, 0.2)'}}>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-semibold">
                {currentUser?.avatar || "U"}
              </span>
            </div>
            <p className="font-medium text-gray-900">
              {displayName}
            </p>
            <p className="text-sm capitalize text-blue-600">
              {currentUser?.role || currentRole}
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
}

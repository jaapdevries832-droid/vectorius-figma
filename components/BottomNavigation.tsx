"use client"

import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Bot,
  Users,
  Calendar,
  Settings,
  BookOpen
} from "lucide-react";
import type { Role } from "app/lib/domain";
import type { SidebarItem } from 'app/lib/types';

interface BottomNavigationProps {
  currentRole: Role;
  activeItem: SidebarItem;
  onItemChange: (item: SidebarItem) => void;
}

export function BottomNavigation({ currentRole, activeItem, onItemChange }: BottomNavigationProps) {
  const getMenuItems = (role: Role) => {
    // Parent-specific menu: simplified navigation matching sidebar
    if (role === 'parent') {
      return [
        { id: 'dashboard' as const, label: 'Home', icon: LayoutDashboard, color: '#3B82F6' },
        { id: 'notes' as const, label: 'Notes', icon: BookOpen, color: '#F59E0B' },
        { id: 'settings' as const, label: 'Settings', icon: Settings, color: '#64748B' },
      ];
    }

    const baseItems = [
      { id: 'dashboard' as const, label: 'Home', icon: LayoutDashboard, color: '#3B82F6' },
      { id: 'schedule' as const, label: 'Schedule', icon: Calendar, color: '#8B5CF6' },
      { id: 'assignments' as const, label: 'Assignments', icon: FileText, color: '#10B981' },
      { id: 'notes' as const, label: 'Notes', icon: MessageSquare, color: '#F59E0B' },
      { id: 'ai-chat' as const, label: 'AI Chat', icon: Bot, color: '#EF4444' },
    ];

    if (role === 'advisor') {
      return [
        baseItems[0], // Dashboard
        { id: 'students' as const, label: 'Students', icon: Users, color: '#8B5CF6' },
        baseItems[1], // Schedule
        baseItems[4], // AI Chat
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems(currentRole);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t safe-area-inset-bottom shadow-lg" style={{borderColor: 'rgba(59, 130, 246, 0.1)'}}>
      <div className="px-4 py-2">
        <div className="flex justify-around">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col items-center space-grid h-auto py-3 px-4 min-w-0 rounded-2xl transition-all duration-200",
                  isActive 
                    ? "text-white shadow-lg" 
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
                  "w-6 h-6 rounded-lg flex items-center justify-center mb-1 transition-all duration-200",
                  isActive 
                    ? "bg-white/20" 
                    : "group-hover:scale-110"
                )}
                style={!isActive ? {backgroundColor: item.color, color: 'white'} : {}}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium truncate leading-none">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

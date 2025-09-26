"use client"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Bell, Settings, LogOut, ChevronDown } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge as UIBadge } from "./ui/badge";

type UserRole = 'student' | 'parent' | 'advisor';

interface UserData {
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
}

interface TopNavigationProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentUser: UserData | null;
  onLogout: () => void;
}

export function TopNavigation({ currentRole, onRoleChange, currentUser, onLogout }: TopNavigationProps) {
  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'student', label: 'Student' },
    { value: 'parent', label: 'Parent' },
    { value: 'advisor', label: 'Advisor' }
  ];

  return (
    <header className="bg-white/95 backdrop-blur-lg border-b px-6 py-4 flex items-center justify-between shadow-sm" style={{borderColor: 'rgba(59, 130, 246, 0.1)'}}>
      <div className="flex items-center space-grid-4">
        <div className="flex items-center space-grid-2">
          <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-semibold text-lg">V</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none text-gray-900">Vectorius</h1>
            <p className="text-xs text-blue-600">Education Platform</p>
          </div>
        </div>
        
        <div className="flex items-center rounded-2xl p-1 space-grid" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}>
          {roleOptions.map((role) => (
            <Button
              key={role.value}
              variant={currentRole === role.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onRoleChange(role.value)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                currentRole === role.value 
                  ? "shadow-md rounded-xl btn-glow" 
                  : "hover:bg-white/50 rounded-xl"
              }`}
              style={currentRole === role.value 
                ? {backgroundColor: '#3B82F6', color: 'white'} 
                : {color: '#3B82F6'}
              }
            >
              {role.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-grid-3">
        <Button variant="ghost" size="sm" className="relative p-3 rounded-2xl transition-colors" style={{'--hover-bg': 'rgba(59, 130, 246, 0.1)'} as any} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Bell className="w-5 h-5 text-blue-600" />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0 animate-pulse">
            3
          </Badge>
        </Button>
        
        <Button variant="ghost" size="sm" className="p-3 rounded-2xl transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Settings className="w-5 h-5 text-blue-600" />
        </Button>
        
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-grid-2 p-2 rounded-2xl transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Avatar className="w-10 h-10 ring-2 ring-blue-200 ring-offset-2">
                <AvatarImage src="" alt={currentUser?.name} />
                <AvatarFallback className="bg-gradient-primary text-white font-medium">
                  {currentUser?.avatar || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none text-gray-900">
                  {currentUser?.name || "User"}
                </p>
                <p className="text-xs capitalize text-blue-600">
                  {currentUser?.role || currentRole}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-blue-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0 rounded-2xl border-0 shadow-xl bg-white/95 backdrop-blur-lg">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-grid-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src="" alt={currentUser?.name} />
                  <AvatarFallback className="bg-gradient-primary text-white font-medium">
                    {currentUser?.avatar || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {currentUser?.name || "User"}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {currentUser?.email || "user@vectorius.edu"}
                  </p>
                  <Badge className="mt-1 capitalize text-xs" 
                    style={
                      currentRole === 'student' 
                        ? {backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6'}
                        : currentRole === 'parent'
                        ? {backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6'}
                        : {backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981'}
                    }>
                    {currentRole}
                  </Badge>
                  {/* Points and Level quick view */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">350 pts</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">Level 2</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <DropdownMenuItem className="rounded-xl p-3 cursor-pointer transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Settings className="w-4 h-4 mr-3 text-blue-600" />
                <span className="text-gray-900">Account Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="rounded-xl p-3 cursor-pointer transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Bell className="w-4 h-4 mr-3 text-blue-600" />
                <span className="text-gray-900">Notifications</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}} />
              
              <DropdownMenuItem 
                className="rounded-xl p-3 cursor-pointer transition-colors text-red-600"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

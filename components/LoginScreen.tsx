"use client"

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  User, 
  Users, 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn,
  Sparkles,
  BookOpen,
  Heart
} from "lucide-react";
import { cn } from "./ui/utils";
import { setCurrentUser } from "app/lib/current-user";

type UserRole = 'student' | 'parent' | 'advisor';

interface LoginScreenProps {
  onLogin?: (role: UserRole, userData: any) => void;
}

interface UserAccount {
  email: string;
  password: string;
  name: string;
  avatar: string;
  role: UserRole;
}

const demoAccounts: UserAccount[] = [
  {
    email: "jordan.davis@student.vectorius.edu",
    password: "student123",
    name: "Jordan Davis",
    avatar: "JD",
    role: "student"
  },
  {
    email: "annie.devries@student.vectorius.edu",
    password: "student123",
    name: "Annie de Vries",
    avatar: "AV",
    role: "student"
  },
  {
    email: "sarah.davis@parent.vectorius.edu", 
    password: "parent123",
    name: "Sarah Davis",
    avatar: "SD",
    role: "parent"
  },
  {
    email: "dr.smith@advisor.vectorius.edu",
    password: "advisor123", 
    name: "Dr. Emily Smith",
    avatar: "ES",
    role: "advisor"
  }
];

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const router = useRouter();
  const _onLogin = onLogin ?? ((role: UserRole) => { router.push(`/${role}`); });
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const roleOptions = [
    { 
      value: 'student' as const, 
      label: 'Student', 
      icon: GraduationCap,
      description: 'Access your assignments and track progress',
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.05)',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    { 
      value: 'parent' as const, 
      label: 'Parent', 
      icon: Heart,
      description: 'Monitor your children\'s academic journey',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.05)',
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100'
    },
    { 
      value: 'advisor' as const, 
      label: 'Advisor', 
      icon: Users,
      description: 'Manage students and create assignments',
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.05)',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100'
    }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find matching account
    const account = demoAccounts.find(
      acc => acc.email === email && 
             acc.password === password && 
             acc.role === selectedRole
    );

    if (account) {
      const userData = {
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        role: account.role
      };
      setCurrentUser(userData);
      _onLogin(selectedRole, userData);
    } else {
      setError('Invalid credentials. Please check your email, password, and selected role.');
    }

    setIsLoading(false);
  };

  const handleDemoLogin = (account: UserAccount) => {
    setSelectedRole(account.role);
    setEmail(account.email);
    setPassword(account.password);
  };

  const selectedRoleData = roleOptions.find(role => role.value === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(255, 255, 255, 1) 50%, rgba(139, 92, 246, 0.03) 100%)'}}>
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Info */}
        <div className="hidden lg:block space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-grid-3 mb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-xl">
                <span className="text-white font-bold text-2xl">V</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Vectorius</h1>
                <p className="text-gray-600 text-lg">Education Platform</p>
              </div>
            </div>
            
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Welcome to the Future of Learning
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Connect students, parents, and advisors in one unified platform designed to enhance educational experiences.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {[
              { icon: BookOpen, title: "Smart Learning", desc: "AI-powered tutoring and personalized study paths" },
              { icon: Users, title: "Connected Communities", desc: "Seamless communication between all stakeholders" },
              { icon: Sparkles, title: "Real-time Insights", desc: "Track progress and performance analytics" }
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-grid-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="glass border-0 shadow-2xl rounded-3xl overflow-hidden animate-slide-up">
            <CardHeader className="text-center py-8" 
              style={selectedRoleData ? {backgroundColor: selectedRoleData.bgColor} : {}}>
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-xl lg:hidden">
                <span className="text-white font-bold text-2xl">V</span>
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900 mb-2">
                Sign In to Vectorius
              </CardTitle>
              <p className="text-gray-600">Choose your role and access your dashboard</p>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Select Your Role</Label>
                <div className="grid grid-cols-1 gap-3">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.value;
                    
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        className={cn(
                          "w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left group",
                          isSelected
                            ? `border-transparent bg-gradient-to-br ${role.bgGradient} shadow-lg`
                            : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center space-grid-3">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-200",
                            isSelected 
                              ? `bg-gradient-to-br ${role.gradient} text-white` 
                              : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                          )}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{role.label}</h3>
                            <p className="text-sm text-gray-600">{role.description}</p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-900">Email Address</Label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 rounded-2xl border-gray-200 focus:border-blue-300 bg-white/80"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-900">Password</Label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 rounded-2xl border-gray-200 focus:border-blue-300 bg-white/80"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full h-12 rounded-2xl font-medium text-white shadow-lg transition-all duration-200 btn-glow",
                    selectedRoleData && `bg-gradient-to-r ${selectedRoleData.gradient}`
                  )}
                >
                  {isLoading ? (
                    <div className="flex items-center space-grid-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-grid-2">
                      <LogIn className="w-5 h-5" />
                      <span>Sign In</span>
                    </div>
                  )}
                </Button>
              </form>

              {/* Demo Accounts */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Try Demo Accounts</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {demoAccounts.map((account, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDemoLogin(account)}
                      className="flex items-center space-grid-3 p-3 rounded-2xl border border-gray-200 hover:border-gray-300 bg-white/80 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-primary text-white font-medium">
                          {account.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{account.name}</p>
                        <p className="text-sm text-gray-600 truncate">{account.email}</p>
                      </div>
                      <Badge className={cn(
                        "capitalize text-xs",
                        account.role === 'student' && "bg-blue-100 text-blue-700",
                        account.role === 'parent' && "bg-green-100 text-green-700", 
                        account.role === 'advisor' && "bg-purple-100 text-purple-700"
                      )}>
                        {account.role}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Branding */}
          <div className="lg:hidden text-center mt-8">
            <p className="text-gray-600">
              © 2025 Vectorius Education Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

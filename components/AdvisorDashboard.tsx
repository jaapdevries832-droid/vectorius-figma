"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  FileText, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export function AdvisorDashboard() {
  const [selectedStudent, setSelectedStudent] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");

  const students = [
    { 
      id: "1", 
      name: "Jordan Davis", 
      grade: "10th", 
      subject: "Mathematics", 
      avatar: "JD",
      performance: 92,
      status: "excellent",
      lastActivity: "2025-09-04",
      assignments: 3,
      pendingTasks: 1
    },
    { 
      id: "2", 
      name: "Taylor Davis", 
      grade: "8th", 
      subject: "Science", 
      avatar: "TD",
      performance: 88,
      status: "good",
      lastActivity: "2025-09-03",
      assignments: 2,
      pendingTasks: 0
    },
    { 
      id: "3", 
      name: "Alex Johnson", 
      grade: "9th", 
      subject: "English", 
      avatar: "AJ",
      performance: 76,
      status: "needs-attention",
      lastActivity: "2025-09-02",
      assignments: 4,
      pendingTasks: 3
    },
    { 
      id: "4", 
      name: "Sam Wilson", 
      grade: "11th", 
      subject: "Chemistry", 
      avatar: "SW",
      performance: 94,
      status: "excellent",
      lastActivity: "2025-09-04",
      assignments: 2,
      pendingTasks: 0
    },
  ];

  const assignments = [
    { id: 1, title: "Chapter 7 Practice Problems", subject: "Mathematics", dueDate: "2025-09-10", assigned: 12, completed: 8 },
    { id: 2, title: "Essay: Environmental Impact", subject: "English", dueDate: "2025-09-12", assigned: 15, completed: 3 },
    { id: 3, title: "Lab Report: Chemical Reactions", subject: "Chemistry", dueDate: "2025-09-15", assigned: 8, completed: 1 },
  ];

  const messages = [
    { from: "Parent - Mrs. Davis", message: "Could we schedule a meeting to discuss Jordan's college prep?", time: "2 hours ago", priority: "high" },
    { from: "Student - Alex Johnson", message: "I'm struggling with the essay assignment. Could you provide guidance?", time: "4 hours ago", priority: "medium" },
    { from: "Parent - Mr. Wilson", message: "Thank you for the detailed progress report!", time: "1 day ago", priority: "low" },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudentData = students.find(student => student.id === selectedStudent);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-700';
      case 'good': return 'bg-blue-100 text-blue-700';
      case 'needs-attention': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'good': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'needs-attention': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Advisor Dashboard</h1>
          <p className="text-gray-600">Manage your students and assignments</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">Total Students</p>
                <p className="text-2xl font-semibold text-blue-700">{students.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">Active Assignments</p>
                <p className="text-2xl font-semibold text-green-700">{assignments.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 mb-1">Avg Performance</p>
                <p className="text-2xl font-semibold text-purple-700">
                  {Math.round(students.reduce((acc, s) => acc + s.performance, 0) / students.length)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 mb-1">Pending Tasks</p>
                <p className="text-2xl font-semibold text-orange-700">
                  {students.reduce((acc, s) => acc + s.pendingTasks, 0)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Student Roster */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student Roster
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedStudent === student.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="" alt={student.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">{student.avatar}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{student.name}</h4>
                        <Badge variant="secondary" className={getStatusColor(student.status)}>
                          {student.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{student.grade} Grade</span>
                        <span>•</span>
                        <span>{student.subject}</span>
                        <span>•</span>
                        <span>{student.performance}% avg</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusIcon(student.status)}
                      {student.pendingTasks > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {student.pendingTasks} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Assignments</CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                New Assignment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{assignment.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{assignment.subject}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {new Date(assignment.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.completed}/{assignment.assigned} completed
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((assignment.completed / assignment.assigned) * 100)}% completion
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communication Panel */}
        <div className="space-y-6">
          {/* Student Quick Profile */}
          {selectedStudentData && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {selectedStudentData.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-gray-900">{selectedStudentData.name}</h3>
                  <p className="text-sm text-gray-600">{selectedStudentData.grade} Grade • {selectedStudentData.subject}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Performance</span>
                    <span className="font-medium">{selectedStudentData.performance}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active Assignments</span>
                    <span className="font-medium">{selectedStudentData.assignments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Activity</span>
                    <span className="font-medium">{new Date(selectedStudentData.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="pt-4 space-y-2">
                  <Button size="sm" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    View Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Recent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className="p-3 rounded-lg border hover:bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm text-gray-900">{message.from}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          message.priority === 'high' ? 'bg-red-100 text-red-700' :
                          message.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {message.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{message.message}</p>
                    <p className="text-xs text-gray-500">{message.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Announcement
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
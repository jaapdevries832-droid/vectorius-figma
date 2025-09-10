"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  BookOpen,
  Users,
  MapPin,
  Edit,
  Trash2
} from "lucide-react";
import { cn } from "./ui/utils";
import { ClassSetupModal } from "./ClassSetupModal";
import { useRoleLayout } from "app/lib/role-layout-context";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface Class {
  id: string;
  name: string;
  professor: string;
  room: string;
  color: string;
  startTime: string;
  endTime: string;
  days: string[];
}

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  day: string;
  color: string;
  type: 'class' | 'study' | 'assignment' | 'personal';
  classId?: string;
}

interface WeeklyPlannerProps {
  currentUser: UserData | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export const DEFAULT_CLASSES: Class[] = [
  {
    id: '1',
    name: 'Advanced Mathematics',
    professor: 'Dr. Johnson',
    room: 'Room 204',
    color: 'bg-blue-500',
    startTime: '09:00',
    endTime: '10:30',
    days: ['Monday', 'Wednesday', 'Friday']
  },
  {
    id: '2',
    name: 'Chemistry Lab',
    professor: 'Prof. Smith',
    room: 'Lab 301',
    color: 'bg-green-500',
    startTime: '14:00',
    endTime: '16:00',
    days: ['Tuesday', 'Thursday']
  },
  {
    id: '3',
    name: 'Literature',
    professor: 'Ms. Davis',
    room: 'Room 105',
    color: 'bg-purple-500',
    startTime: '11:00',
    endTime: '12:30',
    days: ['Monday', 'Wednesday']
  },
  {
    id: '4',
    name: 'History',
    professor: 'Mr. Thompson',
    room: 'Room 210',
    color: 'bg-orange-500',
    startTime: '13:00',
    endTime: '14:30',
    days: ['Tuesday', 'Thursday']
  }
];

export function WeeklyPlanner({ currentUser }: WeeklyPlannerProps) {
  const { openClassSetupTs, activeItem } = useRoleLayout()
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const monday = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    return monday;
  });
  const [classes, setClasses] = useState<Class[]>(DEFAULT_CLASSES);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [isClassSetupOpen, setIsClassSetupOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  // Generate schedule events from classes
  useEffect(() => {
    const events: ScheduleEvent[] = [];
    
    classes.forEach(cls => {
      cls.days.forEach(day => {
        events.push({
          id: `${cls.id}-${day}`,
          title: cls.name,
          description: `${cls.professor} • ${cls.room}`,
          startTime: cls.startTime,
          endTime: cls.endTime,
          day,
          color: cls.color,
          type: 'class',
          classId: cls.id
        });
      });
    });
    
    setScheduleEvents(events);
  }, [classes]);

  const getWeekDates = (startDate: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeek);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  // Open the Class Setup modal on request from layout (e.g., via dashboard)
  useEffect(() => {
    if (activeItem === 'schedule' && openClassSetupTs) {
      setIsClassSetupOpen(true)
    }
  }, [openClassSetupTs, activeItem])

  const getEventsForTimeSlot = (day: string, timeSlot: string) => {
    return scheduleEvents.filter(event => {
      const eventStart = parseInt(event.startTime.split(':')[0]);
      const eventEnd = parseInt(event.endTime.split(':')[0]);
      const slotTime = parseInt(timeSlot.split(':')[0]);
      
      return event.day === day && slotTime >= eventStart && slotTime < eventEnd;
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleAddClass = (classData: Omit<Class, 'id'>) => {
    const newClass: Class = {
      ...classData,
      id: Date.now().toString()
    };
    setClasses([...classes, newClass]);
    setIsClassSetupOpen(false);
  };

  const handleEditClass = (classData: Omit<Class, 'id'>) => {
    if (selectedClass) {
      setClasses(classes.map(cls => 
        cls.id === selectedClass.id 
          ? { ...classData, id: selectedClass.id }
          : cls
      ));
      setSelectedClass(null);
      setIsClassSetupOpen(false);
    }
  };

  const handleDeleteClass = (classId: string) => {
    setClasses(classes.filter(cls => cls.id !== classId));
  };

  const openEditModal = (cls: Class) => {
    setSelectedClass(cls);
    setIsClassSetupOpen(true);
  };

  const isCurrentDay = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 p-8 space-grid-6 animate-fade-in">
      {/* Header */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-grid-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Weekly Schedule</CardTitle>
                <p className="text-gray-600">
                  {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {' '}
                  {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-grid-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => setIsClassSetupOpen(true)}
                className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">{classes.length}</div>
            <div className="text-blue-100 text-sm">Total Classes</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">24</div>
            <div className="text-green-100 text-sm">Hours/Week</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">8</div>
            <div className="text-purple-100 text-sm">Professors</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">12</div>
            <div className="text-orange-100 text-sm">Locations</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule Grid */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 min-w-[800px]">
              {/* Time column header */}
              <div className="bg-gray-50/80 border-r border-gray-200/50 p-4 text-center font-medium text-gray-600">
                Time
              </div>
              
              {/* Day headers */}
              {DAYS.map((day, index) => {
                const date = weekDates[index];
                const isToday = isCurrentDay(date);
                
                return (
                  <div
                    key={day}
                    className={cn(
                      "bg-gray-50/80 border-r border-gray-200/50 p-4 text-center",
                      isToday && "bg-indigo-100/80"
                    )}
                  >
                    <div className={cn(
                      "font-medium text-gray-900",
                      isToday && "text-indigo-700"
                    )}>
                      {day}
                    </div>
                    <div className={cn(
                      "text-sm text-gray-600",
                      isToday && "text-indigo-600"
                    )}>
                      {date.getDate()}
                    </div>
                    {isToday && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mx-auto mt-1" />
                    )}
                  </div>
                );
              })}
              
              {/* Time slots and events */}
              {TIME_SLOTS.map((timeSlot, timeIndex) => (
                <div key={timeSlot} className="contents">
                  {/* Time column */}
                  <div className={cn(
                    "border-r border-b border-gray-200/50 p-4 text-center text-sm font-medium text-gray-600 bg-gray-50/50",
                    timeIndex % 2 === 0 ? "bg-gray-50/30" : "bg-white/50"
                  )}>
                    {formatTime(timeSlot)}
                  </div>
                  
                  {/* Day columns */}
                  {DAYS.map((day, dayIndex) => {
                    const events = getEventsForTimeSlot(day, timeSlot);
                    const isToday = isCurrentDay(weekDates[dayIndex]);
                    
                    return (
                      <div
                        key={`${day}-${timeSlot}`}
                        className={cn(
                          "border-r border-b border-gray-200/50 p-2 min-h-[80px] relative",
                          timeIndex % 2 === 0 
                            ? isToday ? "bg-indigo-50/50" : "bg-gray-50/30"
                            : isToday ? "bg-indigo-50/30" : "bg-white/50",
                          "hover:bg-blue-50/50 transition-colors cursor-pointer"
                        )}
                      >
                        {events.map((event, eventIndex) => (
                          <div
                            key={`${event.id}-${eventIndex}`}
                            className={cn(
                              "rounded-xl p-3 mb-2 shadow-sm border border-white/50 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105",
                              event.color,
                              "text-white relative group"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate leading-tight">
                                  {event.title}
                                </h4>
                                {event.description && (
                                  <p className="text-xs opacity-90 mt-1 leading-tight">
                                    {event.description}
                                  </p>
                                )}
                                <div className="flex items-center mt-2 text-xs opacity-80">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                </div>
                              </div>
                              
                              {event.classId && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/20"
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const cls = classes.find(c => c.id === event.classId);
                                        if (cls) openEditModal(cls);
                                      }}
                                      className="rounded-lg cursor-pointer"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Class
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => event.classId && handleDeleteClass(event.classId)}
                                      className="rounded-lg cursor-pointer text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Class
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Setup Modal */}
      <ClassSetupModal
        isOpen={isClassSetupOpen}
        onClose={() => {
          setIsClassSetupOpen(false);
          setSelectedClass(null);
        }}
        onSave={selectedClass ? handleEditClass : handleAddClass}
        initialData={selectedClass}
        isEditing={!!selectedClass}
      />
    </div>
  );
}

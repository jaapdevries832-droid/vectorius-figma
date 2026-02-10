"use client"

import { useState, useEffect, useCallback } from "react";
import type { ScheduledCourse, User } from "@/lib/domain";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { 
  Calendar, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  BookOpen,
  Users,
  MapPin,
  Edit,
  Trash2,
  Lock
} from "lucide-react";
import { cn } from "./ui/utils";
import { ClassSetupModal } from "./ClassSetupModal";
import { AddEventModal, type CalendarEventForm } from "./AddEventModal";
import { useRoleLayout } from "@/lib/role-layout-context";
import { getCurrentProfile } from "@/lib/profile";
import { fetchStudentScheduleEvents, fetchAdvisorScheduleEvents, mapScheduleEventsToCourses, mapAdvisorScheduleEventsToCourses } from "@/lib/student-schedule";
import { createCalendarEvent, deleteCalendarEvent, fetchCalendarEvents, updateCalendarEvent, type CalendarEvent } from "@/lib/calendar-events";
import { supabase } from "@/lib/supabase/client";
import { addEnrollment, createCourse, deleteCourse, replaceCourseMeetings, updateCourse } from "@/lib/student-classes";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type UserData = User;

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  day: string;
  color: string;
  type: 'class' | 'event';
  classId?: string;
  eventId?: string;
  eventType?: CalendarEvent["event_type"];
  isPrivate?: boolean;
  canEdit?: boolean;
}

interface WeeklyPlannerProps {
  currentUser: UserData | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_INDEX_BY_NAME: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const DAY_NAME_BY_INDEX = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EVENT_TYPE_COLORS: Record<string, string> = {
  appointment: "bg-rose-500",
  school_event: "bg-indigo-500",
  travel: "bg-amber-500",
  extracurricular: "bg-emerald-500",
  study_block: "bg-blue-500",
  other: "bg-slate-500",
};

const padTime = (value: number) => value.toString().padStart(2, "0");

const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;

const formatTimeInput = (date: Date) => `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":");
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
};

export function WeeklyPlanner({ currentUser }: WeeklyPlannerProps) {
  const { openClassSetupTs, activeItem } = useRoleLayout()
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const monday = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    return monday;
  });
  const [classes, setClasses] = useState<ScheduledCourse[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [isClassSetupOpen, setIsClassSetupOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ScheduledCourse | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [parentStudents, setParentStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveStudentId = useCallback(async (userId: string) => {
    const { data: student, error } = await supabase
      .from("students")
      .select("id")
      .eq("student_user_id", userId)
      .maybeSingle();

    if (error || !student?.id) {
      return null;
    }

    return student.id;
  }, []);

  const loadParentStudents = useCallback(async (parentId: string) => {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });

    if (error) {
      setParentStudents([]);
      return null;
    }

    const options = (data ?? []).map((student) => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name ?? ""}`.trim(),
    }));
    setParentStudents(options);

    return options;
  }, []);

  const reloadSchedule = useCallback(async () => {
    setIsLoading(true);

    const { user, profile } = await getCurrentProfile();
    if (!user || !profile) {
      setClasses([]);
      setCalendarEvents([]);
      setIsLoading(false);
      return;
    }

    // Load schedule based on role
    if (profile.role === "advisor") {
      const { data, error } = await fetchAdvisorScheduleEvents(user.id);
      if (error) {
        console.error("Failed to load advisor schedule events", error);
        setClasses([]);
        setCalendarEvents([]);
        setIsLoading(false);
        toast.error("Unable to load your schedule right now.");
        return;
      }
      setClasses(mapAdvisorScheduleEventsToCourses(data));
      setCalendarEvents([]);
    } else {
      const studentId = profile.role === "student" ? await resolveStudentId(user.id) : selectedStudentId;
      if (!studentId) {
        setClasses([]);
        setCalendarEvents([]);
        setIsLoading(false);
        return;
      }
      const { data, error } = await fetchStudentScheduleEvents(studentId);
      if (error) {
        console.error("Failed to load schedule events", error);
        setClasses([]);
        setCalendarEvents([]);
        setIsLoading(false);
        toast.error("Unable to load your schedule right now.");
        return;
      }
      setClasses(mapScheduleEventsToCourses(data));
      const { data: events, error: eventsError } = await fetchCalendarEvents(studentId);
      if (eventsError) {
        console.error("Failed to load calendar events", eventsError);
        setCalendarEvents([]);
      } else {
        setCalendarEvents(events);
      }
    }

    setIsLoading(false);
  }, [resolveStudentId, selectedStudentId]);

  const resolveOwnerIds = useCallback(async (): Promise<{
    studentId: string | null;
    userId: string | null;
    role: string | null;
  } | null> => {
    const { user, profile } = await getCurrentProfile();

    if (!user) {
      toast.error("Please sign in to manage your schedule.");
      return null;
    }

    // For advisors, use their user ID directly
    if (profile?.role === "advisor") {
      return { studentId: null, userId: user.id, role: "advisor" };
    }

    // For students, resolve their student ID
    if (profile?.role === "student") {
      const { data: student, error } = await supabase
        .from("students")
        .select("id")
        .eq("student_user_id", user.id)
        .maybeSingle();

      if (error || !student?.id) {
        console.error("Failed to resolve student id", error);
        toast.error("Unable to load your student profile.");
        return null;
      }

      return { studentId: student.id, userId: null, role: "student" };
    }

    // Other roles not supported for schedules yet
    toast.error("Schedules are available for student and advisor accounts only.");
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSchedule = async () => {
      setIsLoading(true);

      try {
        const { user, profile } = await getCurrentProfile();

        if (!isMounted) return;

        if (!user) {
          setClasses([]);
          setIsLoading(false);
          toast.error("Please sign in to view your schedule.");
          return;
        }

        // Check for supported roles
        if (profile?.role && profile.role !== "student" && profile.role !== "advisor" && profile.role !== "parent") {
          setClasses([]);
          setCalendarEvents([]);
          setIsLoading(false);
          toast.error("Schedules are available for student and advisor accounts only.");
          return;
        }

        setProfileId(profile?.id ?? null);
        setProfileRole(profile?.role ?? null);

        // Load schedule based on role
        if (profile?.role === "advisor") {
          const { data, error } = await fetchAdvisorScheduleEvents(user.id);
          if (!isMounted) return;
          if (error) {
            console.error("Failed to load advisor schedule events", error);
            setClasses([]);
            setCalendarEvents([]);
            setIsLoading(false);
            toast.error("Unable to load your schedule right now.");
            return;
          }
          setClasses(mapAdvisorScheduleEventsToCourses(data));
          setCalendarEvents([]);
          setActiveStudentId(null);
        } else if (profile?.role === "parent") {
          const students = await loadParentStudents(user.id);
          if (!isMounted) return;
          const targetStudentId = selectedStudentId ?? students?.[0]?.id ?? null;
          if (!targetStudentId) {
            setClasses([]);
            setCalendarEvents([]);
            setActiveStudentId(null);
            setIsLoading(false);
            return;
          }
          if (!selectedStudentId) {
            setSelectedStudentId(targetStudentId);
          }
          const { data, error } = await fetchStudentScheduleEvents(targetStudentId);
          if (!isMounted) return;
          if (error) {
            console.error("Failed to load schedule events", error);
            setClasses([]);
            setCalendarEvents([]);
            setIsLoading(false);
            toast.error("Unable to load schedule for that student.");
            return;
          }
          setClasses(mapScheduleEventsToCourses(data));
          const { data: events, error: eventsError } = await fetchCalendarEvents(targetStudentId);
          if (eventsError) {
            console.error("Failed to load calendar events", eventsError);
            setCalendarEvents([]);
          } else {
            setCalendarEvents(events);
          }
          setActiveStudentId(targetStudentId);
        } else {
          const studentId = await resolveStudentId(user.id);
          if (!isMounted) return;
          if (!studentId) {
            setClasses([]);
            setCalendarEvents([]);
            setIsLoading(false);
            toast.error("Unable to load your student profile.");
            return;
          }
          const { data, error } = await fetchStudentScheduleEvents(studentId);
          if (!isMounted) return;
          if (error) {
            console.error("Failed to load schedule events", error);
            setClasses([]);
            setCalendarEvents([]);
            setIsLoading(false);
            toast.error("Unable to load your schedule right now.");
            return;
          }
          setClasses(mapScheduleEventsToCourses(data));
          const { data: events, error: eventsError } = await fetchCalendarEvents(studentId);
          if (eventsError) {
            console.error("Failed to load calendar events", eventsError);
            setCalendarEvents([]);
          } else {
            setCalendarEvents(events);
          }
          setActiveStudentId(studentId);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load schedule events", error);
        setClasses([]);
        setCalendarEvents([]);
        toast.error("Unable to load your schedule right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, loadParentStudents, resolveStudentId, selectedStudentId]);

  // Generate schedule events from classes
  useEffect(() => {
    const events: ScheduleEvent[] = [];
    const weekStart = new Date(currentWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    classes.forEach(cls => {
      cls.days.forEach(day => {
        events.push({
          id: `${cls.id}-${day}`,
          title: cls.name,
          description: `${cls.teacherName}${cls.room ? ` - ${cls.room}` : ""}`,
          startTime: cls.startTime,
          endTime: cls.endTime,
          day,
          color: cls.color ?? 'bg-blue-500',
          type: 'class',
          classId: cls.id
        });
      });
    });

    calendarEvents.forEach((event) => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      if (start < weekStart || start > weekEnd) {
        return;
      }
      const dayName = DAY_NAME_BY_INDEX[start.getDay()] ?? "Day";
      const startTime = event.all_day ? "08:00" : formatTimeInput(start);
      const endTime = event.all_day ? "20:00" : formatTimeInput(end);
      const canEdit = Boolean(profileId && event.created_by && profileId === event.created_by);
      events.push({
        id: `event-${event.id}`,
        eventId: event.id,
        title: event.title,
        description: event.description ?? undefined,
        startTime,
        endTime,
        day: dayName,
        color: EVENT_TYPE_COLORS[event.event_type] ?? "bg-slate-500",
        type: "event",
        eventType: event.event_type,
        isPrivate: event.is_private,
        canEdit,
      });
    });
    
    setScheduleEvents(events);
  }, [calendarEvents, classes, currentWeek, profileId]);

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
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      const slotTime = timeToMinutes(timeSlot);
      
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

  const buildMeetingsPayload = (classData: Omit<ScheduledCourse, "id">) =>
    classData.days.map((day) => ({
      day_of_week: DAY_INDEX_BY_NAME[day] ?? 0,
      start_time: classData.startTime,
      end_time: classData.endTime,
    }));

  const handleAddClass = async (classData: Omit<ScheduledCourse, 'id'>) => {
    const ownerIds = await resolveOwnerIds();
    if (!ownerIds) return;

    setIsLoading(true);
    const { id, error } = await createCourse({
      title: classData.name,
      teacher_name: classData.teacherName,
      location: classData.room ?? null,
      created_by_student_id: ownerIds.studentId,
      created_by_user_id: ownerIds.userId,
    });

    if (error || !id) {
      console.error("Failed to create course", error);
      toast.error("Unable to add that class right now.");
      setIsLoading(false);
      return;
    }

    const meetingError = await replaceCourseMeetings(id, buildMeetingsPayload(classData));
    if (meetingError) {
      console.error("Failed to create class meetings", meetingError);
      toast.error("Unable to save the class schedule right now.");
      setIsLoading(false);
      return;
    }

    // Only enroll if this is a student (advisors don't enroll in their own courses)
    if (ownerIds.studentId) {
      const enrollError = await addEnrollment(ownerIds.studentId, id);
      if (enrollError) {
        console.error("Failed to enroll in class", enrollError);
        toast.error("Class created, but enrollment failed.");
        setIsLoading(false);
        return;
      }
    }

    await reloadSchedule();
    setIsClassSetupOpen(false);
    toast.success(`"${classData.name}" added to your schedule!`);
  };

  const handleEditClass = async (classData: Omit<ScheduledCourse, 'id'>) => {
    if (!selectedClass) return;
    const courseId = selectedClass.id;

    setIsLoading(true);
    const updateError = await updateCourse(courseId, {
      title: classData.name,
      teacher_name: classData.teacherName,
      location: classData.room ?? null,
    });

    if (updateError) {
      console.error("Failed to update class", updateError);
      toast.error("Unable to update that class right now.");
      setIsLoading(false);
      return;
    }

    const meetingError = await replaceCourseMeetings(courseId, buildMeetingsPayload(classData));
    if (meetingError) {
      console.error("Failed to update class meetings", meetingError);
      toast.error("Unable to save the class schedule right now.");
      setIsLoading(false);
      return;
    }

    await reloadSchedule();
    setSelectedClass(null);
    setIsClassSetupOpen(false);
    toast.success(`"${classData.name}" updated successfully!`);
  };

  const handleDeleteClass = async (classId: string) => {
    setIsLoading(true);
    const deleteError = await deleteCourse(classId);
    if (deleteError) {
      console.error("Failed to delete class", deleteError);
      toast.error("Unable to delete that class right now.");
      setIsLoading(false);
      return;
    }

    await reloadSchedule();
    toast.success("Class removed from your schedule.");
  };

  const openEditModal = (cls: ScheduledCourse) => {
    setSelectedClass(cls);
    setIsClassSetupOpen(true);
  };

  const openAddEventModal = () => {
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (eventId: string) => {
    const event = calendarEvents.find((entry) => entry.id === eventId) ?? null;
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setIsLoading(true);
    const deleteError = await deleteCalendarEvent(eventId);
    if (deleteError) {
      console.error("Failed to delete event", deleteError);
      toast.error("Unable to delete that event right now.");
      setIsLoading(false);
      return;
    }

    await reloadSchedule();
    toast.success("Event removed from your schedule.");
  };

  const handleSaveEvent = async (eventInput: CalendarEventForm): Promise<boolean> => {
    const { user, profile } = await getCurrentProfile();
    if (!user || !profile) {
      toast.error("Please sign in to add events.");
      return false;
    }

    const targetStudentId = profile.role === "parent" ? selectedStudentId : activeStudentId;
    if (!targetStudentId) {
      toast.error("Select a student to add events.");
      return false;
    }

    const startTime = eventInput.allDay ? "08:00" : eventInput.startTime;
    const endTime = eventInput.allDay ? "20:00" : eventInput.endTime;
    const startAt = new Date(`${eventInput.date}T${startTime}`);
    const endAt = new Date(`${eventInput.date}T${endTime}`);

    if (!eventInput.allDay && endAt <= startAt) {
      toast.error("End time must be after the start time.");
      return false;
    }

    setIsLoading(true);
    if (selectedEvent) {
      const updateError = await updateCalendarEvent(selectedEvent.id, {
        title: eventInput.title,
        description: eventInput.description ?? null,
        event_type: eventInput.eventType,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        all_day: eventInput.allDay,
        is_private: profile.role === "parent" ? false : eventInput.isPrivate,
      });

      if (updateError) {
        console.error("Failed to update event", updateError);
        toast.error("Unable to update that event right now.");
        setIsLoading(false);
        return false;
      }

      await reloadSchedule();
      setSelectedEvent(null);
      setIsLoading(false);
      toast.success("Event updated successfully.");
      return true;
    }

    const source = profile.role === "parent" ? "parent" : "student";
    const { error } = await createCalendarEvent({
      student_id: targetStudentId,
      title: eventInput.title,
      description: eventInput.description ?? null,
      event_type: eventInput.eventType,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: eventInput.allDay,
      is_private: profile.role === "parent" ? false : eventInput.isPrivate,
      source,
      created_by: profile.id,
    });

    if (error) {
      console.error("Failed to create event", error);
      toast.error("Unable to add that event right now.");
      setIsLoading(false);
      return false;
    }

    await reloadSchedule();
    setIsLoading(false);
    toast.success("Event added to your schedule.");
    return true;
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

              {profileRole !== "parent" && (
                <Button
                  onClick={() => setIsClassSetupOpen(true)}
                  className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              )}
              {profileRole !== "advisor" && (
                <Button
                  variant="outline"
                  onClick={openAddEventModal}
                  className="rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              )}
            </div>
          </div>
          {profileRole === "parent" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">Viewing schedule for</span>
              <select
                value={selectedStudentId ?? ""}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm text-gray-700"
              >
                {parentStudents.length === 0 && (
                  <option value="">No students yet</option>
                )}
                {parentStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name || "Student"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">{isLoading ? "--" : classes.length}</div>
            <div className="text-blue-100 text-sm">Total Classes</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">
              {isLoading ? "--" : (() => {
                const totalMinutes = classes.reduce((sum, cls) => {
                  const startMins = timeToMinutes(cls.startTime);
                  const endMins = timeToMinutes(cls.endTime);
                  const durationMins = endMins - startMins;
                  return sum + (durationMins * cls.days.length);
                }, 0);
                return Math.round(totalMinutes / 60);
              })()}
            </div>
            <div className="text-green-100 text-sm">Hours/Week</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">
              {isLoading ? "--" : new Set(classes.map(c => c.teacherName).filter(Boolean)).size}
            </div>
            <div className="text-purple-100 text-sm">Instructors</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg rounded-2xl card-hover">
          <CardContent className="p-6 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-3 opacity-90" />
            <div className="text-2xl font-semibold mb-1">
              {isLoading ? "--" : new Set(classes.map(c => c.room).filter(Boolean)).size}
            </div>
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
                              {event.eventId && event.canEdit && (
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
                                      onClick={() => openEditEventModal(event.eventId ?? "")}
                                      className="rounded-lg cursor-pointer"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Event
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => event.eventId && handleDeleteEvent(event.eventId)}
                                      className="rounded-lg cursor-pointer text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Event
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            {event.isPrivate && (
                              <div className="mt-2 flex items-center text-xs opacity-80">
                                <Lock className="mr-1 h-3 w-3" />
                                Private
                              </div>
                            )}
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

      <AddEventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        allowPrivate={profileRole !== "parent"}
        initialData={
          selectedEvent
            ? {
                id: selectedEvent.id,
                title: selectedEvent.title,
                description: selectedEvent.description ?? "",
                eventType: selectedEvent.event_type,
                date: formatDateInput(new Date(selectedEvent.start_at)),
                startTime: formatTimeInput(new Date(selectedEvent.start_at)),
                endTime: formatTimeInput(new Date(selectedEvent.end_at)),
                allDay: selectedEvent.all_day,
                isPrivate: selectedEvent.is_private,
              }
            : null
        }
      />
    </div>
  );
}


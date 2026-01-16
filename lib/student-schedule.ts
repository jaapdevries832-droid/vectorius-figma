import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { ScheduledCourse } from "app/lib/domain";

export type StudentScheduleEvent = {
  student_id: string;
  course_id: string;
  title: string;
  teacher_name: string | null;
  location: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CLASS_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-pink-500",
];

const scheduleColorFor = (courseId: string, color: string | null) => {
  if (color) return color;
  let hash = 0;
  for (let i = 0; i < courseId.length; i += 1) {
    hash = (hash * 31 + courseId.charCodeAt(i)) % CLASS_COLORS.length;
  }
  return CLASS_COLORS[hash] ?? "bg-blue-500";
};

const scheduleDayName = (dayIndex: number) => DAY_NAMES[dayIndex] ?? "Day";

export async function fetchStudentScheduleEvents(studentId?: string): Promise<{
  data: StudentScheduleEvent[];
  error: PostgrestError | null;
}> {
  // If studentId provided, fetch directly from tables (for advisors viewing student schedules)
  if (studentId) {
    const { data, error } = await supabase
      .from("student_course_enrollments")
      .select(`
        student_id,
        course:courses!inner(
          id,
          title,
          teacher_name,
          location,
          course_meetings!inner(
            day_of_week,
            start_time,
            end_time
          )
        )
      `)
      .eq("student_id", studentId);

    if (error) {
      return { data: [], error };
    }

    // Flatten the nested structure
    type CourseMeeting = {
      day_of_week: number;
      start_time: string;
      end_time: string;
    };
    type CourseData = {
      id: string;
      title: string;
      teacher_name: string | null;
      location: string | null;
      course_meetings: CourseMeeting[];
    };
    type EnrollmentRow = {
      student_id: string;
      course: CourseData;
    };
    const events: StudentScheduleEvent[] = [];
    (data as unknown as EnrollmentRow[] | null)?.forEach((enrollment) => {
      const course = enrollment.course;
      course?.course_meetings?.forEach((meeting) => {
        events.push({
          student_id: enrollment.student_id,
          course_id: course.id,
          title: course.title,
          teacher_name: course.teacher_name,
          location: course.location,
          day_of_week: meeting.day_of_week,
          start_time: meeting.start_time,
          end_time: meeting.end_time,
          color: null,
        });
      });
    });

    // Sort by day and time
    events.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.start_time.localeCompare(b.start_time);
    });

    return { data: events, error: null };
  }

  // Default: use view for current user (students viewing their own schedule)
  const { data, error } = await supabase
    .from("student_schedule_events")
    .select(
      "student_id, course_id, title, teacher_name, location, day_of_week, start_time, end_time, color",
    )
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return { data: (data ?? []) as StudentScheduleEvent[], error: error ?? null };
}

export type AdvisorScheduleEvent = {
  course_id: string;
  title: string;
  teacher_name: string | null;
  location: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string | null;
};

export async function fetchAdvisorScheduleEvents(userId: string): Promise<{
  data: AdvisorScheduleEvent[];
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      teacher_name,
      location,
      course_meetings(
        day_of_week,
        start_time,
        end_time
      )
    `)
    .eq("created_by_user_id", userId);

  if (error) {
    return { data: [], error };
  }

  type CourseMeeting = {
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
  type CourseRow = {
    id: string;
    title: string;
    teacher_name: string | null;
    location: string | null;
    course_meetings: CourseMeeting[];
  };

  const events: AdvisorScheduleEvent[] = [];
  (data as unknown as CourseRow[] | null)?.forEach((course) => {
    course.course_meetings?.forEach((meeting) => {
      events.push({
        course_id: course.id,
        title: course.title,
        teacher_name: course.teacher_name,
        location: course.location,
        day_of_week: meeting.day_of_week,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        color: null,
      });
    });
  });

  events.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.start_time.localeCompare(b.start_time);
  });

  return { data: events, error: null };
}

export function mapAdvisorScheduleEventsToCourses(events: AdvisorScheduleEvent[]): ScheduledCourse[] {
  const grouped = new Map<string, ScheduledCourse>();

  events.forEach((event) => {
    const key = event.course_id;
    const existing = grouped.get(key);
    const dayName = scheduleDayName(event.day_of_week);

    if (existing) {
      if (!existing.days.includes(dayName)) {
        existing.days.push(dayName);
      }
      return;
    }

    grouped.set(key, {
      id: event.course_id,
      name: event.title,
      teacherName: event.teacher_name ?? "Staff",
      room: event.location ?? undefined,
      startTime: event.start_time,
      endTime: event.end_time,
      days: [dayName],
      color: scheduleColorFor(event.course_id, event.color),
    });
  });

  return Array.from(grouped.values()).map((course) => ({
    ...course,
    days: course.days.sort((a, b) => DAY_NAMES.indexOf(a) - DAY_NAMES.indexOf(b)),
  }));
}

export function mapScheduleEventsToCourses(events: StudentScheduleEvent[]): ScheduledCourse[] {
  const grouped = new Map<string, ScheduledCourse>();

  events.forEach((event) => {
    const key = event.course_id;
    const existing = grouped.get(key);
    const dayName = scheduleDayName(event.day_of_week);

    if (existing) {
      if (!existing.days.includes(dayName)) {
        existing.days.push(dayName);
      }
      return;
    }

    grouped.set(key, {
      id: event.course_id,
      name: event.title,
      teacherName: event.teacher_name ?? "Staff",
      room: event.location ?? undefined,
      startTime: event.start_time,
      endTime: event.end_time,
      days: [dayName],
      color: scheduleColorFor(event.course_id, event.color),
    });
  });

  return Array.from(grouped.values()).map((course) => ({
    ...course,
    days: course.days.sort((a, b) => DAY_NAMES.indexOf(a) - DAY_NAMES.indexOf(b)),
  }));
}

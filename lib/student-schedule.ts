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

export async function fetchStudentScheduleEvents(): Promise<{
  data: StudentScheduleEvent[];
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from("student_schedule_events")
    .select(
      "student_id, course_id, title, teacher_name, location, day_of_week, start_time, end_time, color",
    )
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return { data: (data ?? []) as StudentScheduleEvent[], error: error ?? null };
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

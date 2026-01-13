import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type CourseMeeting = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type CourseWithMeetings = {
  id: string;
  title: string;
  teacher_name: string | null;
  location: string | null;
  course_meetings: CourseMeeting[] | null;
};

export type EnrollmentWithCourse = {
  id: string;
  course_id: string;
  course: CourseWithMeetings | null;
};

export type Subject = {
  id: string;
  name: string;
};

export async function fetchCourses(): Promise<CourseWithMeetings[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, teacher_name, location, course_meetings(day_of_week, start_time, end_time)")
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchMyEnrollments(studentId: string): Promise<EnrollmentWithCourse[]> {
  const { data, error } = await supabase
    .from("student_course_enrollments")
    .select(
      "id, course_id, course:courses(id, title, teacher_name, location, course_meetings(day_of_week, start_time, end_time))",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    course_id: string;
    course: CourseWithMeetings | CourseWithMeetings[] | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    course_id: row.course_id,
    course: Array.isArray(row.course) ? row.course[0] ?? null : row.course,
  }));
}

export async function addEnrollment(studentId: string, courseId: string): Promise<PostgrestError | null> {
  const { error } = await supabase.from("student_course_enrollments").insert({
    student_id: studentId,
    course_id: courseId,
  });

  return error ?? null;
}

export async function createCourse(params: {
  title: string;
  teacher_name?: string | null;
  location?: string | null;
  subject_id?: string | null;
  created_by_student_id: string;
}): Promise<{ id: string | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: params.title,
      teacher_name: params.teacher_name ?? null,
      location: params.location ?? null,
      subject_id: params.subject_id ?? null,
      created_by_student_id: params.created_by_student_id,
    })
    .select("id")
    .single();

  return { id: data?.id ?? null, error: error ?? null };
}

export async function updateCourse(
  courseId: string,
  params: {
    title: string;
    teacher_name?: string | null;
    location?: string | null;
  },
): Promise<PostgrestError | null> {
  const { error } = await supabase
    .from("courses")
    .update({
      title: params.title,
      teacher_name: params.teacher_name ?? null,
      location: params.location ?? null,
    })
    .eq("id", courseId);

  return error ?? null;
}

export async function deleteCourse(courseId: string): Promise<PostgrestError | null> {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  return error ?? null;
}

export async function replaceCourseMeetings(
  courseId: string,
  meetings: Array<{ day_of_week: number; start_time: string; end_time: string }>,
): Promise<PostgrestError | null> {
  const { error: deleteError } = await supabase.from("course_meetings").delete().eq("course_id", courseId);
  if (deleteError) {
    return deleteError;
  }

  if (meetings.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase.from("course_meetings").insert(
    meetings.map((meeting) => ({
      course_id: courseId,
      day_of_week: meeting.day_of_week,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
    })),
  );

  return insertError ?? null;
}

export async function removeEnrollment(studentId: string, courseId: string): Promise<PostgrestError | null> {
  const { error } = await supabase
    .from("student_course_enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  return error ?? null;
}

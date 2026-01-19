import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type CalendarEventType =
  | "appointment"
  | "school_event"
  | "travel"
  | "extracurricular"
  | "study_block"
  | "other";

export type CalendarEvent = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string;
  all_day: boolean;
  is_private: boolean;
  source: string;
  created_by: string | null;
};

export async function fetchCalendarEvents(studentId: string): Promise<{
  data: CalendarEvent[];
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, student_id, title, description, event_type, start_at, end_at, all_day, is_private, source, created_by",
    )
    .eq("student_id", studentId)
    .order("start_at", { ascending: true });

  return { data: (data ?? []) as CalendarEvent[], error: error ?? null };
}

export async function createCalendarEvent(payload: {
  student_id: string;
  title: string;
  description?: string | null;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string;
  all_day: boolean;
  is_private: boolean;
  source: string;
  created_by?: string | null;
}): Promise<{ data: CalendarEvent | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      student_id: payload.student_id,
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.event_type,
      start_at: payload.start_at,
      end_at: payload.end_at,
      all_day: payload.all_day,
      is_private: payload.is_private,
      source: payload.source,
      created_by: payload.created_by ?? null,
    })
    .select(
      "id, student_id, title, description, event_type, start_at, end_at, all_day, is_private, source, created_by",
    )
    .single();

  return { data: (data ?? null) as CalendarEvent | null, error: error ?? null };
}

export async function updateCalendarEvent(
  eventId: string,
  payload: {
    title: string;
    description?: string | null;
    event_type: CalendarEventType;
    start_at: string;
    end_at: string;
    all_day: boolean;
    is_private: boolean;
  },
): Promise<PostgrestError | null> {
  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.event_type,
      start_at: payload.start_at,
      end_at: payload.end_at,
      all_day: payload.all_day,
      is_private: payload.is_private,
    })
    .eq("id", eventId);

  return error ?? null;
}

export async function deleteCalendarEvent(eventId: string): Promise<PostgrestError | null> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  return error ?? null;
}

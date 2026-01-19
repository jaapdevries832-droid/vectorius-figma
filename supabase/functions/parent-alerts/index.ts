import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string;
  type: string | null;
  student_id: string;
  students?: { parent_id: string | null } | { parent_id: string | null }[] | null;
  suggestion_responded_at?: string | null;
};

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing Supabase credentials.", { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const fetchAssignments = async (query: ReturnType<typeof admin.from>) => {
    const { data, error } = await query;
    if (error) {
      console.error("Alert generation query failed", error);
      return [] as AssignmentRow[];
    }
    return data as AssignmentRow[];
  };

  const overdueAssignments = await fetchAssignments(
    admin
      .from("assignments")
      .select("id, title, due_at, type, student_id, students(parent_id)")
      .lt("due_at", nowIso)
      .not("status", "in", "(completed,archived)")
  );

  const upcomingAssignments = await fetchAssignments(
    admin
      .from("assignments")
      .select("id, title, due_at, type, student_id, students(parent_id)")
      .in("type", ["test", "project"])
      .gte("due_at", nowIso)
      .lte("due_at", weekFromNow)
      .not("status", "in", "(completed,archived)")
  );

  const declinedSuggestions = await fetchAssignments(
    admin
      .from("assignments")
      .select("id, title, due_at, type, student_id, suggestion_responded_at, students(parent_id)")
      .eq("is_suggested", true)
      .eq("suggestion_status", "declined")
      .gte("suggestion_responded_at", weekAgo)
  );

  const resolveParentId = (row: AssignmentRow) => {
    const parent = Array.isArray(row.students) ? row.students[0] : row.students;
    return parent?.parent_id ?? null;
  };

  const alreadyAlerted = async (parentId: string, alertType: string, referenceId: string) => {
    const { data } = await admin
      .from("parent_alerts")
      .select("id")
      .eq("parent_id", parentId)
      .eq("alert_type", alertType)
      .eq("reference_id", referenceId)
      .gte("created_at", weekAgo)
      .limit(1);
    return (data ?? []).length > 0;
  };

  const createAlert = async (payload: {
    parent_id: string;
    student_id: string;
    alert_type: string;
    title: string;
    message: string;
    reference_id: string;
  }) => {
    const exists = await alreadyAlerted(payload.parent_id, payload.alert_type, payload.reference_id);
    if (exists) return;
    await admin.from("parent_alerts").insert({
      parent_id: payload.parent_id,
      student_id: payload.student_id,
      alert_type: payload.alert_type,
      title: payload.title,
      message: payload.message,
      reference_id: payload.reference_id,
    });
  };

  for (const row of overdueAssignments) {
    const parentId = resolveParentId(row);
    if (!parentId) continue;
    await createAlert({
      parent_id: parentId,
      student_id: row.student_id,
      alert_type: "overdue_assignment",
      title: "Overdue assignment",
      message: `${row.title} is overdue.`,
      reference_id: row.id,
    });
  }

  for (const row of upcomingAssignments) {
    const parentId = resolveParentId(row);
    if (!parentId) continue;
    const alertType = row.type === "project" ? "upcoming_project" : "upcoming_test";
    await createAlert({
      parent_id: parentId,
      student_id: row.student_id,
      alert_type: alertType,
      title: row.type === "project" ? "Upcoming project" : "Upcoming test",
      message: `${row.title} is coming up soon.`,
      reference_id: row.id,
    });
  }

  for (const row of declinedSuggestions) {
    const parentId = resolveParentId(row);
    if (!parentId) continue;
    await createAlert({
      parent_id: parentId,
      student_id: row.student_id,
      alert_type: "suggestion_declined",
      title: "Suggestion declined",
      message: `${row.title} was declined by the student.`,
      reference_id: row.id,
    });
  }

  return new Response("Alerts generated", { status: 200 });
});

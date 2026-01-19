"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";
import type { Role } from "app/lib/domain";

type ParsedEvent = {
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  type?: string | null;
  all_day?: boolean;
  description?: string | null;
};

type StudentOption = {
  id: string;
  name: string;
};

const EVENT_TYPE_VALUES = [
  "appointment",
  "school_event",
  "travel",
  "extracurricular",
  "study_block",
  "other",
] as const;

const normalizeEventType = (value?: string | null) =>
  EVENT_TYPE_VALUES.includes((value ?? "").toLowerCase() as (typeof EVENT_TYPE_VALUES)[number])
    ? (value ?? "other").toLowerCase()
    : "other";

const buildDateTime = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();

const addOneHour = (time: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  const nextHour = (hours + 1) % 24;
  const padded = String(nextHour).padStart(2, "0");
  return `${padded}:${String(minutes).padStart(2, "0")}`;
};

export default function ImportEmailPage({ params }: { params: { role: Role } }) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [rawText, setRawText] = useState("");
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [ingestId, setIngestId] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      const { user, profile } = await getCurrentProfile();

      if (!user || !profile) {
        router.push("/login");
        return;
      }

      if (profile.role !== "parent" || params.role !== "parent") {
        router.push(`/${profile.role}`);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Unable to load students.");
        return;
      }

      const options = (data ?? []).map((student) => ({
        id: student.id,
        name: `${student.first_name} ${student.last_name ?? ""}`.trim(),
      }));

      setStudents(options);
      if (options.length && !selectedStudentId) {
        setSelectedStudentId(options[0].id);
      }
    };

    loadStudents();
  }, [params.role, router, selectedStudentId]);

  const selectionLabel = useMemo(() => {
    const student = students.find((option) => option.id === selectedStudentId);
    return student?.name ?? "Select a student";
  }, [selectedStudentId, students]);

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error("Paste an email to parse.");
      return;
    }
    if (!selectedStudentId) {
      toast.error("Select a student first.");
      return;
    }

    setIsParsing(true);
    setParsedEvents([]);
    setSelectedEvents(new Set());
    setIngestId(null);

    const response = await fetch("/api/parse-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText }),
    });

    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload?.error ?? "Unable to parse the email.");
      setIsParsing(false);
      return;
    }

    const events: ParsedEvent[] = Array.isArray(payload?.events) ? payload.events : [];
    setParsedEvents(events);
    setSelectedEvents(new Set(events.map((_, index) => index)));

    const { user } = await getCurrentProfile();
    if (user) {
      const { data, error } = await supabase
        .from("email_ingests")
        .insert({
          parent_id: user.id,
          student_id: selectedStudentId,
          raw_text: rawText,
          parsed_events: events,
          status: "parsed",
        })
        .select("id")
        .single();

      if (!error && data?.id) {
        setIngestId(data.id);
      }
    }

    if (events.length === 0) {
      toast.message("No events detected. Try a different email snippet.");
    } else {
      toast.success(`Found ${events.length} event${events.length === 1 ? "" : "s"}.`);
    }
    setIsParsing(false);
  };

  const handleToggleEvent = (index: number) => {
    setSelectedEvents((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (!selectedStudentId) {
      toast.error("Select a student first.");
      return;
    }

    const selected = parsedEvents.filter((_, index) => selectedEvents.has(index));
    if (selected.length === 0) {
      toast.error("Select at least one event.");
      return;
    }

    const { user } = await getCurrentProfile();
    if (!user) {
      toast.error("Please sign in again.");
      return;
    }

    setIsImporting(true);
    const rows = selected.map((event) => {
      const isAllDay = Boolean(event.all_day) || !event.start_time;
      const startTime = event.start_time ?? "08:00";
      const endTime = event.end_time ?? addOneHour(startTime);
      return {
        student_id: selectedStudentId,
        title: event.title ?? "Imported event",
        description: event.description ?? null,
        event_type: normalizeEventType(event.type),
        start_at: buildDateTime(event.date, isAllDay ? "08:00" : startTime),
        end_at: buildDateTime(event.date, isAllDay ? "20:00" : endTime),
        all_day: isAllDay,
        is_private: false,
        source: "manual_import",
        created_by: user.id,
      };
    });

    const { error } = await supabase.from("calendar_events").insert(rows);
    if (error) {
      toast.error(error.message || "Unable to import events.");
      setIsImporting(false);
      return;
    }

    if (ingestId) {
      await supabase
        .from("email_ingests")
        .update({ status: "imported" })
        .eq("id", ingestId);
    }

    toast.success("Events imported to the calendar.");
    setIsImporting(false);
    setParsedEvents([]);
    setSelectedEvents(new Set());
    setRawText("");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Import School Email</h1>
        <p className="text-sm text-gray-600">Paste an email and import key dates into the calendar.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Student</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={selectionLabel} />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste the school email here..."
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            className="min-h-[180px]"
          />
          <Button onClick={handleParse} disabled={isParsing}>
            {isParsing ? "Parsing..." : "Parse Email"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parsed Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {parsedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">No events parsed yet.</p>
          )}
          {parsedEvents.map((event, index) => (
            <label
              key={`${event.title}-${index}`}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <input
                type="checkbox"
                checked={selectedEvents.has(index)}
                onChange={() => handleToggleEvent(index)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-600">
                  {event.date}
                  {event.start_time ? ` • ${event.start_time}` : " • All day"}
                </p>
                {event.description && (
                  <p className="mt-1 text-xs text-gray-500">{event.description}</p>
                )}
              </div>
            </label>
          ))}
          {parsedEvents.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import Selected"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

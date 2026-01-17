"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  StickyNote,
  Plus,
  Trash2,
  User,
  MessageSquare,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type StudentNote = {
  id: string;
  body: string;
  color: string;
  created_at: string;
};

type AdvisorNote = {
  id: string;
  advisor_id: string;
  student_id: string;
  message: string;
  priority: string;
  created_at: string;
  advisor_name?: string;
  student_name?: string;
};

type Student = {
  id: string;
  name: string;
  initials: string;
};

interface NotesPageProps {
  role: string;
}

const noteColors = ["sticky-note", "sticky-note-blue", "sticky-note-green"];

export function NotesPage({ role }: NotesPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [advisorNotes, setAdvisorNotes] = useState<AdvisorNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Load data based on role
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { user, profile } = await getCurrentProfile();

    if (!user || !profile) {
      setIsLoading(false);
      return;
    }

    // Use profile role if available, fall back to prop
    const effectiveRole = profile.role || role;

    if (effectiveRole === "student") {
      // Load student's own notes and advisor notes about them
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_user_id", user.id)
        .maybeSingle();

      // Log for debugging
      if (studentError) {
        console.error("[NotesPage] Error querying student:", studentError);
      }
      if (!student) {
        console.warn("[NotesPage] No student found for user:", user.id);
      }

      if (student) {
        setStudentId(student.id);

        // Load personal notes
        const { data: notes } = await supabase
          .from("student_notes")
          .select("id, body, color, created_at")
          .eq("student_id", student.id)
          .is("archived_at", null)
          .order("created_at", { ascending: false });

        setStudentNotes(notes ?? []);

        // Load advisor notes about this student
        const { data: advNotes } = await supabase
          .from("advisor_notes")
          .select("id, advisor_id, student_id, message, priority, created_at")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false });

        setAdvisorNotes(advNotes ?? []);
      }
    } else if (effectiveRole === "advisor") {
      // Load advisor's students
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("advisor_id", user.id);

      const mappedStudents: Student[] = (studentData ?? []).map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name ?? ""}`.trim(),
        initials: `${s.first_name?.[0] ?? ""}${s.last_name?.[0] ?? ""}`.toUpperCase(),
      }));

      setStudents(mappedStudents);

      if (mappedStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(mappedStudents[0].id);
      }

      // Load advisor's notes
      const { data: advNotes } = await supabase
        .from("advisor_notes")
        .select("id, advisor_id, student_id, message, priority, created_at")
        .eq("advisor_id", user.id)
        .order("created_at", { ascending: false });

      setAdvisorNotes(advNotes ?? []);
    } else if (effectiveRole === "parent") {
      // Load children and their advisor notes
      const { data: children } = await supabase
        .from("student_parent")
        .select("student:students(id, first_name, last_name)")
        .eq("parent_id", user.id);

      const studentIds = (children ?? [])
        .map((c) => {
          const student = Array.isArray(c.student) ? c.student[0] : c.student;
          return student?.id;
        })
        .filter(Boolean) as string[];

      if (studentIds.length > 0) {
        const { data: advNotes } = await supabase
          .from("advisor_notes")
          .select("id, advisor_id, student_id, message, priority, created_at")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false });

        // Enrich with student names
        const enrichedNotes = (advNotes ?? []).map((note) => {
          const child = (children ?? []).find((c) => {
            const student = Array.isArray(c.student) ? c.student[0] : c.student;
            return student?.id === note.student_id;
          });
          const student = child
            ? Array.isArray(child.student)
              ? child.student[0]
              : child.student
            : null;
          return {
            ...note,
            student_name: student
              ? `${student.first_name} ${student.last_name ?? ""}`.trim()
              : "Unknown",
          };
        });

        setAdvisorNotes(enrichedNotes);
      }
    }

    setIsLoading(false);
  }, [role, selectedStudentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add personal note (student only)
  const handleAddStudentNote = async () => {
    if (!studentId || !newNote.trim()) return;

    const color = noteColors[studentNotes.length % noteColors.length];
    const { data, error } = await supabase
      .from("student_notes")
      .insert({ student_id: studentId, body: newNote.trim(), color })
      .select("id, body, color, created_at")
      .single();

    if (error) {
      toast.error("Unable to add note right now.");
      return;
    }

    if (data) {
      setStudentNotes((prev) => [data, ...prev]);
      setNewNote("");
      toast.success("Note added!");
    }
  };

  // Delete personal note (student only)
  const handleDeleteStudentNote = async (noteId: string) => {
    const { error } = await supabase
      .from("student_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast.error("Unable to delete note.");
      return;
    }

    setStudentNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast.success("Note deleted.");
  };

  // Add advisor note (advisor only)
  const handleAddAdvisorNote = async () => {
    if (!selectedStudentId || !newNote.trim()) {
      toast.error("Please select a student and enter a message.");
      return;
    }

    const { user } = await getCurrentProfile();
    if (!user) return;

    const { data, error } = await supabase
      .from("advisor_notes")
      .insert({
        advisor_id: user.id,
        student_id: selectedStudentId,
        message: newNote.trim(),
        priority: "normal",
      })
      .select("id, advisor_id, student_id, message, priority, created_at")
      .single();

    if (error) {
      toast.error("Unable to add note: " + error.message);
      return;
    }

    if (data) {
      setAdvisorNotes((prev) => [data, ...prev]);
      setNewNote("");
      toast.success("Note sent to student and parents!");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getSelectedStudentName = () => {
    const student = students.find((s) => s.id === selectedStudentId);
    return student?.name ?? "Select a student";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  // Student view
  if (role === "student") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">My Notes</h1>
              <p className="text-muted-foreground text-sm">
                Personal notes and advisor feedback
              </p>
            </div>
          </div>
        </div>

        {/* Add Note */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Textarea
                placeholder="Add a quick note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 min-h-[80px]"
              />
              <Button onClick={handleAddStudentNote} disabled={!newNote.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5" />
              My Personal Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentNotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No personal notes yet. Add one above!
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {studentNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl ${note.color} relative group`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(note.created_at)}
                    </p>
                    <button
                      onClick={() => handleDeleteStudentNote(note.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advisor Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Advisor Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            {advisorNotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No feedback from your advisor yet.
              </p>
            ) : (
              <div className="space-y-3">
                {advisorNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-blue-50 border border-blue-100"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-500 text-white text-xs">
                          AD
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">{note.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                      {note.priority === "high" && (
                        <Badge variant="destructive" className="text-xs">
                          Important
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Advisor view
  if (role === "advisor") {
    const notesForSelectedStudent = advisorNotes.filter(
      (n) => n.student_id === selectedStudentId
    );

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Student Notes</h1>
              <p className="text-muted-foreground text-sm">
                Send feedback to students and parents
              </p>
            </div>
          </div>
        </div>

        {/* Student selector */}
        {students.length > 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Select Student
                  </label>
                  <Select
                    value={selectedStudentId ?? ""}
                    onValueChange={(val) => setSelectedStudentId(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-blue-100">
                                {student.initials}
                              </AvatarFallback>
                            </Avatar>
                            {student.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">
                No students assigned to you yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add note form */}
        {selectedStudentId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Send Note to {getSelectedStudentName()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Textarea
                  placeholder="Write feedback or a note for this student..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 min-h-[100px]"
                />
                <Button
                  onClick={handleAddAdvisorNote}
                  disabled={!newNote.trim()}
                  className="self-end"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This note will be visible to the student and their parents.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes list */}
        {selectedStudentId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Notes for {getSelectedStudentName()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notesForSelectedStudent.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No notes for this student yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {notesForSelectedStudent.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-gray-50 border"
                    >
                      <p className="text-sm">{note.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Parent view
  if (role === "parent") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Advisor Notes</h1>
            <p className="text-muted-foreground text-sm">
              Feedback from your child&apos;s advisor
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {advisorNotes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-muted-foreground">
                  No advisor notes yet. Check back later!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {advisorNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-blue-50 border border-blue-100"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-500 text-white">
                          AD
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">Advisor</span>
                          {note.student_name && (
                            <Badge variant="secondary" className="text-xs">
                              Re: {note.student_name}
                            </Badge>
                          )}
                          {note.priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              Important
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{note.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Notes are not available for your role.</p>
    </div>
  );
}

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
  Edit2,
  User,
  MessageSquare,
  Send,
  Lock,
} from "lucide-react";
import { NoteEditModal } from "./NoteEditModal";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/profile";
import { toast } from "sonner";
import { ConfirmDialog } from "./ui/ConfirmDialog";
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

type ParentNote = {
  id: string;
  parent_user_id: string;
  student_id: string;
  recipient_type: string;
  message: string;
  priority: string;
  created_at: string;
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
  const [noteEditOpen, setNoteEditOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string; body: string; color: string } | null>(null);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const [parentNotes, setParentNotes] = useState<ParentNote[]>([]);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [parentChildren, setParentChildren] = useState<Student[]>([]);
  const [parentSelectedChild, setParentSelectedChild] = useState<string | null>(null);
  const [parentNoteText, setParentNoteText] = useState("");
  const [parentRecipient, setParentRecipient] = useState<"student" | "advisor" | "both">("both");
  const [parentNotePriority, setParentNotePriority] = useState<"normal" | "high">("normal");
  const [isSendingParentNote, setIsSendingParentNote] = useState(false);

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
      setParentUserId(user.id);

      // Load children and their advisor notes
      const { data: children } = await supabase
        .from("student_parent")
        .select("student:students(id, first_name, last_name)")
        .eq("parent_id", user.id);

      const mappedChildren: Student[] = (children ?? [])
        .map((c) => {
          const student = Array.isArray(c.student) ? c.student[0] : c.student;
          if (!student) return null;
          return {
            id: student.id,
            name: `${student.first_name} ${student.last_name ?? ""}`.trim(),
            initials: `${student.first_name?.[0] ?? ""}${student.last_name?.[0] ?? ""}`.toUpperCase(),
          };
        })
        .filter(Boolean) as Student[];

      setParentChildren(mappedChildren);
      if (mappedChildren.length > 0 && !parentSelectedChild) {
        setParentSelectedChild(mappedChildren[0].id);
      }

      const studentIds = mappedChildren.map((c) => c.id);

      if (studentIds.length > 0) {
        const { data: advNotes } = await supabase
          .from("advisor_notes")
          .select("id, advisor_id, student_id, message, priority, created_at")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false });

        // Enrich with student names
        const enrichedNotes = (advNotes ?? []).map((note) => {
          const child = mappedChildren.find((c) => c.id === note.student_id);
          return {
            ...note,
            student_name: child?.name ?? "Unknown",
          };
        });

        setAdvisorNotes(enrichedNotes);

        // Load parent's own notes
        const { data: pNotes } = await supabase
          .from("parent_notes")
          .select("id, parent_user_id, student_id, recipient_type, message, priority, created_at")
          .eq("parent_user_id", user.id)
          .order("created_at", { ascending: false });

        setParentNotes(pNotes ?? []);
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
  const confirmDeleteStudentNote = async () => {
    if (!noteToDeleteId) return;
    const { error } = await supabase
      .from("student_notes")
      .delete()
      .eq("id", noteToDeleteId);

    if (error) {
      toast.error("Unable to delete note.");
      return;
    }

    setStudentNotes((prev) => prev.filter((n) => n.id !== noteToDeleteId));
    setNoteToDeleteId(null);
    toast.success("Note deleted.");
  };

  // Edit personal note (student only)
  const handleEditStudentNote = (note: StudentNote) => {
    setEditingNote({ id: note.id, body: note.body, color: note.color });
    setNoteEditOpen(true);
  };

  // Open modal for new note
  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteEditOpen(true);
  };

  // Save note (create or update)
  const handleSaveNote = async (body: string, color: string) => {
    if (!studentId) return;

    if (editingNote) {
      // Update existing note
      const { error } = await supabase
        .from("student_notes")
        .update({ body, color })
        .eq("id", editingNote.id);

      if (error) {
        toast.error("Unable to update note.");
        return;
      }

      setStudentNotes((prev) =>
        prev.map((n) => (n.id === editingNote.id ? { ...n, body, color } : n))
      );
      toast.success("Note updated!");
    } else {
      // Create new note
      const { data, error } = await supabase
        .from("student_notes")
        .insert({ student_id: studentId, body, color })
        .select("id, body, color, created_at")
        .single();

      if (error) {
        toast.error("Unable to add note.");
        return;
      }

      if (data) {
        setStudentNotes((prev) => [data, ...prev]);
        toast.success("Note added!");
      }
    }
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

  // Send parent note
  const handleSendParentNote = async () => {
    if (!parentUserId || !parentSelectedChild || !parentNoteText.trim()) {
      toast.error("Please select a student and enter a message.");
      return;
    }

    setIsSendingParentNote(true);

    const { data, error } = await supabase
      .from("parent_notes")
      .insert({
        parent_user_id: parentUserId,
        student_id: parentSelectedChild,
        recipient_type: parentRecipient,
        message: parentNoteText.trim(),
        priority: parentNotePriority,
      })
      .select("id, parent_user_id, student_id, recipient_type, message, priority, created_at")
      .single();

    if (error) {
      toast.error("Unable to send note: " + error.message);
      setIsSendingParentNote(false);
      return;
    }

    if (data) {
      setParentNotes((prev) => [data, ...prev]);
      setParentNoteText("");
      setParentNotePriority("normal");
      toast.success("Note sent!");
    }
    setIsSendingParentNote(false);
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="h-4 w-4" />
            Only you can see your personal notes.
          </div>
          <p className="mt-1 text-amber-800">
            These notes are private by default and are not shared with parents.
          </p>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="w-5 h-5" />
                My Personal Notes
              </CardTitle>
              <div className="mt-1 inline-flex items-center gap-2 text-xs text-amber-700">
                <Lock className="h-3 w-3" />
                Private
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenNewNote}>
              <Plus className="w-4 h-4 mr-1" />
              New Note
            </Button>
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
                    <p className="text-sm whitespace-pre-wrap pr-14">{note.body}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(note.created_at)}
                    </p>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditStudentNote(note)}
                        className="p-1.5 hover:bg-white/50 rounded"
                        title="Edit note"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                          onClick={() => setNoteToDeleteId(note.id)}
                        className="p-1.5 hover:bg-red-100/50 rounded"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note Edit Modal */}
      <NoteEditModal
        open={noteEditOpen}
        onClose={() => setNoteEditOpen(false)}
        onSave={handleSaveNote}
        initialBody={editingNote?.body ?? ""}
        initialColor={editingNote?.color ?? noteColors[studentNotes.length % noteColors.length]}
        isNew={!editingNote}
      />
      <ConfirmDialog
        open={Boolean(noteToDeleteId)}
        onOpenChange={(open) => {
          if (!open) setNoteToDeleteId(null);
        }}
        title="Delete this note?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          void confirmDeleteStudentNote();
        }}
      />

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
    const filteredAdvisorNotes = parentSelectedChild
      ? advisorNotes.filter((n) => n.student_id === parentSelectedChild)
      : advisorNotes;
    const filteredParentNotes = parentSelectedChild
      ? parentNotes.filter((n) => n.student_id === parentSelectedChild)
      : parentNotes;

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Notes</h1>
              <p className="text-muted-foreground text-sm">
                Write notes and view advisor feedback
              </p>
            </div>
          </div>

          {parentChildren.length > 1 && (
            <Select
              value={parentSelectedChild ?? ""}
              onValueChange={setParentSelectedChild}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {parentChildren.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <Lock className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Student notes are private.</p>
                <p className="mt-1 text-gray-600">
                  Personal notes are visible only to the student to support wellbeing and reflection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Write Note */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4" />
              Write a Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={parentNoteText}
              onChange={(e) => setParentNoteText(e.target.value)}
              placeholder="Write a note to the student's advisor, to the student, or both..."
              rows={3}
              className="resize-none"
            />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">To:</span>
                <Select
                  value={parentRecipient}
                  onValueChange={(v) => setParentRecipient(v as "student" | "advisor" | "both")}
                >
                  <SelectTrigger className="w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="student">Student only</SelectItem>
                    <SelectItem value="advisor">Advisor only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Priority:</span>
                <Select
                  value={parentNotePriority}
                  onValueChange={(v) => setParentNotePriority(v as "normal" | "high")}
                >
                  <SelectTrigger className="w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleSendParentNote}
                disabled={isSendingParentNote || !parentNoteText.trim() || !parentSelectedChild}
                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-3 h-3 mr-1" />
                {isSendingParentNote ? "Sending..." : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Notes */}
        {filteredParentNotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredParentNotes.map((note) => {
                  const recipientLabel =
                    note.recipient_type === "both"
                      ? "Student & Advisor"
                      : note.recipient_type === "student"
                        ? "Student"
                        : "Advisor";
                  const childName = parentChildren.find((c) => c.id === note.student_id)?.name;

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-green-50 border border-green-100"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">You</span>
                        <Badge variant="secondary" className="text-xs">
                          To: {recipientLabel}
                        </Badge>
                        {childName && parentChildren.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            Re: {childName}
                          </Badge>
                        )}
                        {note.priority === "high" && (
                          <Badge variant="destructive" className="text-xs">
                            Important
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{note.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advisor Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advisor Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAdvisorNotes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-muted-foreground">
                  No advisor notes yet. Check back later!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAdvisorNotes.map((note) => (
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
                          {note.student_name && parentChildren.length > 1 && (
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

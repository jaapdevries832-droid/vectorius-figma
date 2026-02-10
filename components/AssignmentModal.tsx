"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { BookOpen, ClipboardCheck, HelpCircle, Briefcase, CalendarDays, Save, X, AlertCircle } from "lucide-react"
import { validateTitle, validateFutureDate } from "@/lib/validation"
import type { LucideIcon } from "lucide-react"
import type { ScheduledCourse } from "@/lib/domain"
import { toast } from "sonner"

export type AssignmentType = 'homework' | 'quiz' | 'test' | 'project'

export interface AssignmentInput {
  title: string
  type: AssignmentType
  classId: string
  dueDate: string // yyyy-mm-dd
  notes?: string
  color?: string
}

export interface AssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (assignment: AssignmentInput) => Promise<boolean>
  classes: ScheduledCourse[]
}

const typeOptions: { key: AssignmentType; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'homework', label: 'Homework', icon: BookOpen, color: 'text-blue-600' },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'text-purple-600' },
  { key: 'test', label: 'Test', icon: ClipboardCheck, color: 'text-green-600' },
  { key: 'project', label: 'Project', icon: Briefcase, color: 'text-pink-600' },
]

const colorOptions = [
  { key: '', label: 'Default' },
  { key: 'bg-gray-500', label: 'Gray' },
  { key: 'bg-red-500', label: 'Red' },
  { key: 'bg-orange-500', label: 'Orange' },
  { key: 'bg-amber-500', label: 'Amber' },
  { key: 'bg-yellow-500', label: 'Yellow' },
  { key: 'bg-lime-500', label: 'Lime' },
  { key: 'bg-green-500', label: 'Green' },
  { key: 'bg-emerald-500', label: 'Emerald' },
  { key: 'bg-teal-500', label: 'Teal' },
  { key: 'bg-cyan-500', label: 'Cyan' },
  { key: 'bg-blue-500', label: 'Blue' },
  { key: 'bg-indigo-500', label: 'Indigo' },
  { key: 'bg-violet-500', label: 'Violet' },
  { key: 'bg-purple-500', label: 'Purple' },
  { key: 'bg-fuchsia-500', label: 'Fuchsia' },
  { key: 'bg-pink-500', label: 'Pink' },
  { key: 'bg-rose-500', label: 'Rose' },
]

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export function AssignmentModal({ isOpen, onClose, onSave, classes }: AssignmentModalProps) {
  const [form, setForm] = useState<AssignmentInput>({
    title: '',
    type: 'homework',
    classId: classes[0]?.id ?? 'none',
    dueDate: todayIso(),
    notes: '',
    color: '',
  })
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        type: 'homework',
        classId: classes[0]?.id ?? 'none',
        dueDate: todayIso(),
        notes: '',
        color: '',
      })
      setErrors({})
      setIsSaving(false)
    }
  }, [isOpen, classes])

  const selectedClass = useMemo(() => form.classId === 'none' ? null : classes.find(c => c.id === form.classId), [classes, form.classId])
  const selectedType = useMemo(() => typeOptions.find(t => t.key === form.type), [form.type])

  const handleSave = async () => {
    const newErrors: { title?: string; dueDate?: string } = {}

    // Validate title
    const titleValidation = validateTitle(form.title, "Title")
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error
    }

    // Validate due date
    const dateValidation = validateFutureDate(form.dueDate, "Due date")
    if (!dateValidation.valid) {
      newErrors.dueDate = dateValidation.error
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setIsSaving(true)
    try {
      const ok = await onSave({ ...form })
      if (ok) {
        onClose()
        return
      }
      toast.error("Could not save assignment. Please try again.")
    } catch (error) {
      console.error("Failed to save assignment", error)
      toast.error("Could not save assignment. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Determine preview color
  const previewColor = form.color || selectedClass?.color || 'bg-indigo-500'

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onClose()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-0 shadow-2xl rounded-3xl p-8">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Add Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Fields */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Class */}
            <div className="space-y-2">
              <Label>Class {classes.length === 0 && <span className="text-gray-400 text-sm">(optional)</span>}</Label>
              <Select value={form.classId} onValueChange={(val) => setForm(prev => ({ ...prev, classId: val }))}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white/80">
                  <SelectValue placeholder="Select a class (optional)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                      No class
                    </div>
                  </SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cls.color}`}></span>
                        {cls.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type - Now a dropdown */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(val) => setForm(prev => ({ ...prev, type: val as AssignmentType }))}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {typeOptions.map(opt => {
                    const Icon = opt.icon
                    return (
                      <SelectItem key={opt.key} value={opt.key} className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g., Chapter 7 Homework"
              value={form.title}
              onChange={(e) => {
                setForm(prev => ({ ...prev, title: e.target.value }))
                if (errors.title) setErrors(prev => ({ ...prev, title: undefined }))
              }}
              className={`rounded-xl bg-white/80 focus:border-indigo-300 ${errors.title ? "border-red-300" : "border-gray-200"}`}
            />
            {errors.title && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Due date and Color */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Due date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                min={todayIso()}
                value={form.dueDate}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, dueDate: e.target.value }))
                  if (errors.dueDate) setErrors(prev => ({ ...prev, dueDate: undefined }))
                }}
                className={`rounded-xl bg-white/80 focus:border-indigo-300 ${errors.dueDate ? "border-red-300" : "border-gray-200"}`}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.dueDate}
                </p>
              )}
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(opt => (
                  <button
                    key={opt.key || 'default'}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, color: opt.key }))}
                    className={`w-7 h-7 rounded-lg transition-all ${
                      opt.key === ''
                        ? 'bg-gradient-to-br from-gray-200 to-gray-300'
                        : opt.key
                    } ${
                      form.color === opt.key
                        ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any extra details…"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300 min-h-[80px]"
            />
          </div>

          {/* Preview - Now below the form */}
          <div className="space-y-3 pt-4 border-t border-gray-200/50">
            <h3 className="font-semibold text-gray-900">Preview</h3>
            <div className="p-5 rounded-2xl border border-gray-100 bg-white/60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${previewColor} text-white shadow-md`}>
                    {(() => {
                      const Icon = selectedType?.icon ?? BookOpen
                      return <Icon className="w-5 h-5" />
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 leading-tight truncate">
                      {form.title || 'Untitled Assignment'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${selectedClass?.color ?? 'bg-gray-300'}`}></span>
                      <span className="truncate">{selectedClass?.name || 'No class'}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Due {form.dueDate || todayIso()}</span>
                    </div>
                    {form.notes && (
                      <div className="mt-3 text-sm text-gray-700 line-clamp-2">{form.notes}</div>
                    )}
                  </div>
                </div>
                <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs flex-shrink-0">
                  {selectedType?.label ?? form.type}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200/50 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-gray-200 hover:bg-gray-50"
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


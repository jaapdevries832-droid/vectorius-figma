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
import type { ScheduledCourse } from "app/lib/domain"

export type AssignmentType = 'homework' | 'quiz' | 'test' | 'project'

export interface AssignmentInput {
  title: string
  type: AssignmentType
  classId: string
  dueDate: string // yyyy-mm-dd
  notes?: string
}

export interface AssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (assignment: AssignmentInput) => void
  classes: ScheduledCourse[]
}

const typeOptions: { key: AssignmentType; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'homework', label: 'Homework', icon: BookOpen, color: 'text-blue-600' },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'text-purple-600' },
  { key: 'test', label: 'Test', icon: ClipboardCheck, color: 'text-green-600' },
  { key: 'project', label: 'Project', icon: Briefcase, color: 'text-pink-600' },
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
  })
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({})

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        type: 'homework',
        classId: classes[0]?.id ?? 'none',
        dueDate: todayIso(),
        notes: '',
      })
      setErrors({})
    }
  }, [isOpen, classes])

  const selectedClass = useMemo(() => form.classId === 'none' ? null : classes.find(c => c.id === form.classId), [classes, form.classId])

  const handleSave = () => {
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
    onSave({ ...form })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass border-0 shadow-2xl rounded-3xl p-8">
        <DialogHeader className="pb-8">
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Add Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Form */}
          <div className="space-y-6">
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
                      General (no specific class)
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
              <p className="text-xs text-gray-500">At least 3 characters</p>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {typeOptions.map(opt => {
                  const Icon = opt.icon
                  const active = form.type === opt.key
                  return (
                    <Button
                      key={opt.key}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => setForm(prev => ({ ...prev, type: opt.key }))}
                      className={active ? 'bg-gradient-primary text-white rounded-xl shadow-md btn-glow' : 'rounded-xl border-gray-200 hover:bg-gray-50'}
                    >
                      <Icon className={`w-4 h-4 mr-2 ${active ? 'text-white' : opt.color}`} />
                      {opt.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Due date */}
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any extra details…"
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300 min-h-[120px]"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">Preview</h3>
            <div className="p-5 rounded-2xl border border-gray-100 bg-white/60">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md">
                    {(() => {
                      const Icon = typeOptions.find(t => t.key === form.type)?.icon ?? BookOpen
                      return <Icon className="w-5 h-5" />
                    })()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 leading-tight">{form.title || 'Untitled Assignment'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${selectedClass?.color ?? 'bg-gray-300'}`}></span>
                      {selectedClass?.name || 'General'}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 flex items-center gap">
                      <CalendarDays className="w-3 h-3" />
                      <span>Due {form.dueDate || todayIso()}</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">{form.type}</Badge>
              </div>
              {form.notes && (
                <div className="mt-3 text-sm text-gray-700 line-clamp-3">{form.notes}</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-8 border-t border-gray-200/50 mt-8">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-gray-200 hover:bg-gray-50">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow">
            <Save className="w-4 h-4 mr-2" />
            Save Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


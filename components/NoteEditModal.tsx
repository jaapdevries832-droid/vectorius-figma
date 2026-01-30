"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { cn } from "./ui/utils"

const NOTE_COLORS = [
  { id: "bg-yellow-100", label: "Yellow" },
  { id: "bg-blue-100", label: "Blue" },
  { id: "bg-green-100", label: "Green" },
  { id: "bg-pink-100", label: "Pink" },
  { id: "bg-purple-100", label: "Purple" },
  { id: "bg-orange-100", label: "Orange" },
]

type NoteEditModalProps = {
  open: boolean
  onClose: () => void
  onSave: (body: string, color: string) => void
  initialBody?: string
  initialColor?: string
  isNew?: boolean
}

export function NoteEditModal({
  open,
  onClose,
  onSave,
  initialBody = "",
  initialColor = "bg-yellow-100",
  isNew = false,
}: NoteEditModalProps) {
  const [body, setBody] = useState(initialBody)
  const [color, setColor] = useState(initialColor)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setBody(initialBody)
      setColor(initialColor)
    }
  }, [open, initialBody, initialColor])

  const handleSave = async () => {
    if (!body.trim()) return
    setIsSaving(true)
    await onSave(body.trim(), color)
    setIsSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "New Note" : "Edit Note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Note body */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Note Content
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    c.id,
                    color === c.id ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Preview
            </label>
            <div className={cn("p-4 rounded-xl shadow-sm", color)}>
              <p className="text-sm font-medium text-gray-800 leading-relaxed">
                {body || "Your note will appear here..."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!body.trim() || isSaving}
            className="bg-gradient-primary text-white"
          >
            {isSaving ? "Saving..." : isNew ? "Add Note" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

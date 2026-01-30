"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { supabase } from "@/lib/supabase/client"
import { getCurrentProfile } from "@/lib/profile"
import { toast } from "sonner"

type Priority = "low" | "normal" | "high"

type AdvisorMessageModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
}

export function AdvisorMessageModal({ open, onClose, studentId, studentName }: AdvisorMessageModalProps) {
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<Priority>("normal")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsLoading(true)

    const { user } = await getCurrentProfile()
    if (!user) {
      toast.error("Please sign in to send messages")
      setIsLoading(false)
      return
    }

    const { error } = await supabase.from("advisor_notes").insert({
      advisor_id: user.id,
      student_id: studentId,
      message: message.trim(),
      priority,
    })

    if (error) {
      toast.error(`Failed to send message: ${error.message}`)
      setIsLoading(false)
      return
    }

    toast.success("Message sent to student and parents!")
    setMessage("")
    setPriority("normal")
    setIsLoading(false)
    onClose()
  }

  const handleClose = () => {
    setMessage("")
    setPriority("normal")
    onClose()
  }

  const priorityOptions: { value: Priority; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "bg-gray-100 text-gray-700 border-gray-300" },
    { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-700 border-blue-300" },
    { value: "high", label: "High", color: "bg-red-100 text-red-700 border-red-300" },
  ]

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? handleClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Message to {studentName}</DialogTitle>
          <DialogDescription>
            This message will be visible to {studentName} and their parents in the advisor notes section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    priority === opt.value
                      ? opt.color
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message or feedback..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isLoading || !message.trim()}>
              {isLoading ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

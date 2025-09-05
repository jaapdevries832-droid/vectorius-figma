"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  BookOpen,
  Clock,
  MapPin,
  User,
  Palette,
  CalendarDays,
  X,
  Save,
  Plus
} from "lucide-react";
import { cn } from "./ui/utils";

interface Class {
  id: string;
  name: string;
  professor: string;
  room: string;
  color: string;
  startTime: string;
  endTime: string;
  days: string[];
}

interface ClassSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classData: Omit<Class, 'id'>) => void;
  initialData?: Class | null;
  isEditing?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Monday', short: 'Mon' },
  { value: 'Tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'Wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'Thursday', label: 'Thursday', short: 'Thu' },
  { value: 'Friday', label: 'Friday', short: 'Fri' },
  { value: 'Saturday', label: 'Saturday', short: 'Sat' },
  { value: 'Sunday', label: 'Sunday', short: 'Sun' }
];

const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Blue', color: '#3b82f6' },
  { value: 'bg-green-500', label: 'Green', color: '#10b981' },
  { value: 'bg-purple-500', label: 'Purple', color: '#8b5cf6' },
  { value: 'bg-pink-500', label: 'Pink', color: '#ec4899' },
  { value: 'bg-orange-500', label: 'Orange', color: '#f97316' },
  { value: 'bg-red-500', label: 'Red', color: '#ef4444' },
  { value: 'bg-indigo-500', label: 'Indigo', color: '#6366f1' },
  { value: 'bg-teal-500', label: 'Teal', color: '#14b8a6' },
  { value: 'bg-yellow-500', label: 'Yellow', color: '#eab308' },
  { value: 'bg-slate-500', label: 'Slate', color: '#64748b' }
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  const time24 = `${hour}:00`;
  const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
  const ampm = i < 12 ? 'AM' : 'PM';
  const time12 = `${hour12}:00 ${ampm}`;
  return { value: time24, label: time12 };
});

export function ClassSetupModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  isEditing = false 
}: ClassSetupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    professor: '',
    room: '',
    color: 'bg-blue-500',
    startTime: '09:00',
    endTime: '10:30',
    days: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        professor: initialData.professor,
        room: initialData.room,
        color: initialData.color,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        days: initialData.days
      });
    } else {
      setFormData({
        name: '',
        professor: '',
        room: '',
        color: 'bg-blue-500',
        startTime: '09:00',
        endTime: '10:30',
        days: []
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (!formData.professor.trim()) {
      newErrors.professor = 'Professor name is required';
    }

    if (!formData.room.trim()) {
      newErrors.room = 'Room/Location is required';
    }

    if (formData.days.length === 0) {
      newErrors.days = 'Please select at least one day';
    }

    // Check if end time is after start time
    const startMinutes = timeToMinutes(formData.startTime);
    const endMinutes = timeToMinutes(formData.endTime);
    
    if (endMinutes <= startMinutes) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const selectedColorOption = COLOR_OPTIONS.find(c => c.value === formData.color);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center space-grid-3 text-2xl">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            {isEditing ? 'Edit Class' : 'Add New Class'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="flex items-center space-grid-2 font-semibold text-gray-900">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Class Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-grid-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  Class Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Advanced Mathematics"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300",
                    errors.name && "border-red-300 focus:border-red-300"
                  )}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="professor" className="flex items-center space-grid-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Professor
                </Label>
                <Input
                  id="professor"
                  placeholder="e.g., Dr. Johnson"
                  value={formData.professor}
                  onChange={(e) => setFormData(prev => ({ ...prev, professor: e.target.value }))}
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300",
                    errors.professor && "border-red-300 focus:border-red-300"
                  )}
                />
                {errors.professor && <p className="text-sm text-red-600">{errors.professor}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room" className="flex items-center space-grid-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Room/Location
                </Label>
                <Input
                  id="room"
                  placeholder="e.g., Room 204 or Building A"
                  value={formData.room}
                  onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/80 focus:border-indigo-300",
                    errors.room && "border-red-300 focus:border-red-300"
                  )}
                />
                {errors.room && <p className="text-sm text-red-600">{errors.room}</p>}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-grid-2">
                  <Palette className="w-4 h-4 text-gray-500" />
                  Color Theme
                </Label>
                <div className="grid grid-cols-5 gap-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={cn(
                        "w-10 h-10 rounded-xl shadow-sm border-2 transition-all duration-200 hover:scale-110",
                        formData.color === color.value 
                          ? "border-gray-900 ring-2 ring-gray-300 ring-offset-2" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      style={{ backgroundColor: color.color }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-6">
            <h3 className="flex items-center space-grid-2 font-semibold text-gray-900">
              <Clock className="w-5 h-5 text-indigo-500" />
              Schedule
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center space-grid-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Start Time
                </Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}
                >
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value} className="rounded-lg">
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-grid-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  End Time
                </Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
                >
                  <SelectTrigger className={cn(
                    "rounded-xl border-gray-200 bg-white/80",
                    errors.endTime && "border-red-300"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value} className="rounded-lg">
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.endTime && <p className="text-sm text-red-600">{errors.endTime}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <Label className={cn(
                "flex items-center space-grid-2",
                errors.days && "text-red-600"
              )}>
                <CalendarDays className="w-4 h-4 text-gray-500" />
                Days of the Week
              </Label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formData.days.includes(day.value) ? "default" : "outline"}
                    onClick={() => handleDayToggle(day.value)}
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      formData.days.includes(day.value)
                        ? "bg-gradient-primary text-white shadow-md btn-glow"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <span className="md:hidden">{day.short}</span>
                    <span className="hidden md:inline">{day.label}</span>
                  </Button>
                ))}
              </div>
              {errors.days && <p className="text-sm text-red-600">{errors.days}</p>}
            </div>
          </div>

          {/* Preview */}
          {formData.name && (
            <div className="space-y-3">
              <h3 className="flex items-center space-grid-2 font-semibold text-gray-900">
                Preview
              </h3>
              <div className={cn(
                "rounded-xl p-4 shadow-sm border border-white/50 text-white",
                formData.color
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium mb-1">{formData.name}</h4>
                    <p className="text-sm opacity-90 mb-2">
                      {formData.professor} • {formData.room}
                    </p>
                    <div className="flex items-center text-sm opacity-80">
                      <Clock className="w-3 h-3 mr-1" />
                      {TIME_OPTIONS.find(t => t.value === formData.startTime)?.label} - {' '}
                      {TIME_OPTIONS.find(t => t.value === formData.endTime)?.label}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.days.map(day => (
                        <span key={day} className="text-xs bg-white/20 px-2 py-1 rounded-lg">
                          {DAYS_OF_WEEK.find(d => d.value === day)?.short}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-grid-3 pt-6 border-t border-gray-200/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-gray-200 hover:bg-gray-50"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-primary text-white rounded-xl shadow-md btn-glow"
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Class' : 'Add Class'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
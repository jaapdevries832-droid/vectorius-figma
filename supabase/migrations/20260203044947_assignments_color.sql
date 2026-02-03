-- Add color column to assignments for custom color selection
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS color text;
COMMENT ON COLUMN public.assignments.color IS 'Custom Tailwind color class for assignment display (e.g., bg-blue-500)';

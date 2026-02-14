-- Advisors can see non-private calendar events for their assigned students
DROP POLICY IF EXISTS "calendar_events_advisor_select" ON public.calendar_events;

CREATE POLICY "calendar_events_advisor_select" ON public.calendar_events
  FOR SELECT
  TO authenticated
  USING (
    calendar_events.is_private = false
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = calendar_events.student_id
        AND s.advisor_id = auth.uid()
    )
  );

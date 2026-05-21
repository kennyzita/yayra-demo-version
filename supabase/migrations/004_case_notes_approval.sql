-- Add approved/rejected statuses to case_notes (timesheets already has them)
ALTER TABLE public.case_notes
  DROP CONSTRAINT IF EXISTS case_notes_status_check;

ALTER TABLE public.case_notes
  ADD CONSTRAINT case_notes_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));

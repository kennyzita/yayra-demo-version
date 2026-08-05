ALTER TABLE public.case_notes
  ADD COLUMN IF NOT EXISTS approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_name text;

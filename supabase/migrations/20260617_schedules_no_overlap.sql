-- Nothing prevented the same DSP from being double-booked: two overlapping
-- shifts (same dsp_id, overlapping date/time range) could both be inserted,
-- which is physically impossible and corrupts downstream timesheet/payroll data.
-- Add a DB-level exclusion constraint as the source of truth; rejected shifts
-- are excluded since they no longer hold a claim on the DSP's time.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.schedules
  ADD CONSTRAINT schedules_no_dsp_overlap
  EXCLUDE USING gist (
    dsp_id WITH =,
    tsrange(date + start_time, date + end_time, '[)') WITH &&
  )
  WHERE (status <> 'rejected');

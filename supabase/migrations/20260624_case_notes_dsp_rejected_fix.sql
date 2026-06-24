-- The DSP "edit/delete a rejected case note" policies added in
-- 20260617_tighten_rls_policies.sql only matched status = 'draft'. The UI lets a
-- DSP reopen a *rejected* note, but the UPDATE/DELETE silently affects 0 rows
-- under RLS (no error is raised) — the data never actually changes. Widen both
-- policies to also cover 'rejected', and add a WITH CHECK on the update policy so
-- a DSP can move a rejected note back to 'submitted' but can never self-approve
-- or re-reject their own note.
--
-- Safe to re-run: every DROP/CREATE pair below is idempotent, so running this
-- file twice (e.g. after a partial failure) won't error.
DROP POLICY IF EXISTS "dsp_update_own_draft_case_notes" ON public.case_notes;
DROP POLICY IF EXISTS "dsp_delete_own_draft_case_notes" ON public.case_notes;
DROP POLICY IF EXISTS "dsp_update_own_case_notes" ON public.case_notes;
DROP POLICY IF EXISTS "dsp_delete_own_case_notes" ON public.case_notes;

CREATE POLICY "dsp_update_own_case_notes" ON public.case_notes
  FOR UPDATE USING (dsp_id = auth.uid() AND status IN ('draft', 'rejected'))
  WITH CHECK (dsp_id = auth.uid() AND status IN ('draft', 'submitted'));

CREATE POLICY "dsp_delete_own_case_notes" ON public.case_notes
  FOR DELETE USING (dsp_id = auth.uid() AND status IN ('draft', 'rejected'));

-- 1. The DSP "edit/delete a rejected case note" policies added in
--    20260617_tighten_rls_policies.sql only matched status = 'draft'. The UI lets a
--    DSP reopen a *rejected* note, but the UPDATE/DELETE silently affects 0 rows
--    under RLS (no error is raised) — the data never actually changes. Widen both
--    policies to also cover 'rejected', and add a WITH CHECK on the update policy so
--    a DSP can move a rejected note back to 'submitted' but can never self-approve
--    or re-reject their own note.
DROP POLICY IF EXISTS "dsp_update_own_draft_case_notes" ON public.case_notes;
DROP POLICY IF EXISTS "dsp_delete_own_draft_case_notes" ON public.case_notes;

CREATE POLICY "dsp_update_own_case_notes" ON public.case_notes
  FOR UPDATE USING (dsp_id = auth.uid() AND status IN ('draft', 'rejected'))
  WITH CHECK (dsp_id = auth.uid() AND status IN ('draft', 'submitted'));

CREATE POLICY "dsp_delete_own_case_notes" ON public.case_notes
  FOR DELETE USING (dsp_id = auth.uid() AND status IN ('draft', 'rejected'));

-- 2. SCD Type 2 history for case_notes. Admin and DSP staff can now both rewrite
--    every section of a case note (client, week, strategies, entries, status), so we
--    keep a full version trail rather than only the latest state. The live row in
--    case_notes stays the "current" version (every existing read/approve/reject/
--    edit/delete code path keeps working against a stable id); a BEFORE UPDATE/DELETE
--    trigger archives the version being replaced into case_notes_history with its
--    [valid_from, valid_to) window, who closed it, and why.
CREATE TABLE IF NOT EXISTS public.case_notes_history (
  history_id    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_note_id  UUID NOT NULL,
  dsp_id        UUID NOT NULL,
  client_id     UUID NOT NULL,
  week_label    TEXT NOT NULL,
  strategies    TEXT[] DEFAULT '{}',
  entries       JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL,
  version_no    INT NOT NULL,
  valid_from    TIMESTAMPTZ NOT NULL,
  valid_to      TIMESTAMPTZ NOT NULL,
  changed_by    UUID,
  change_type   TEXT NOT NULL CHECK (change_type IN ('update', 'delete')),
  recorded_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_notes_history_unique_version ON public.case_notes_history(case_note_id, version_no);
CREATE INDEX IF NOT EXISTS idx_case_notes_history_dsp ON public.case_notes_history(dsp_id);

ALTER TABLE public.case_notes_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsp_select_own_case_notes_history" ON public.case_notes_history
  FOR SELECT USING (dsp_id = auth.uid());

CREATE POLICY "admin_select_all_case_notes_history" ON public.case_notes_history
  FOR SELECT USING (public.is_admin_or_hr());

CREATE OR REPLACE FUNCTION public.case_notes_record_history()
RETURNS TRIGGER AS $$
DECLARE
  prior_version INT;
  prior_valid_to TIMESTAMPTZ;
BEGIN
  SELECT version_no, valid_to INTO prior_version, prior_valid_to
  FROM public.case_notes_history
  WHERE case_note_id = OLD.id
  ORDER BY version_no DESC
  LIMIT 1;

  INSERT INTO public.case_notes_history (
    case_note_id, dsp_id, client_id, week_label, strategies, entries,
    status, submitted_at, created_at, version_no, valid_from, valid_to,
    changed_by, change_type
  ) VALUES (
    OLD.id, OLD.dsp_id, OLD.client_id, OLD.week_label, OLD.strategies, OLD.entries,
    OLD.status, OLD.submitted_at, OLD.created_at,
    COALESCE(prior_version, 0) + 1,
    COALESCE(prior_valid_to, OLD.created_at),
    NOW(),
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS case_notes_history_before_update ON public.case_notes;
CREATE TRIGGER case_notes_history_before_update
  BEFORE UPDATE ON public.case_notes
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.case_notes_record_history();

DROP TRIGGER IF EXISTS case_notes_history_before_delete ON public.case_notes;
CREATE TRIGGER case_notes_history_before_delete
  BEFORE DELETE ON public.case_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.case_notes_record_history();

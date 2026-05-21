-- Timesheets: one record per DSP per client per week
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dsp_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  total_hours NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  dsp_signed BOOLEAN DEFAULT false,
  client_signed BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(dsp_id, client_id, week_start)
);

-- Case notes: one record per DSP per client per week
CREATE TABLE IF NOT EXISTS public.case_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dsp_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  week_label TEXT NOT NULL,
  strategies TEXT[] DEFAULT '{}',
  entries JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

-- DSPs see only their own records
CREATE POLICY "dsp_own_timesheets" ON public.timesheets
  FOR ALL USING (dsp_id = auth.uid());

CREATE POLICY "admin_all_timesheets" ON public.timesheets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('Admin','HR')
    )
  );

CREATE POLICY "dsp_own_case_notes" ON public.case_notes
  FOR ALL USING (dsp_id = auth.uid());

CREATE POLICY "admin_all_case_notes" ON public.case_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('Admin','HR')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_dsp ON public.timesheets(dsp_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_client ON public.timesheets(client_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_dsp ON public.case_notes(dsp_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_client ON public.case_notes(client_id);

-- Updated_at trigger for timesheets
CREATE TRIGGER timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Scheduling: one record per shift assignment
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  dsp_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','auto_accepted')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Admin/HR: full access (explicit WITH CHECK required for INSERT to work)
CREATE POLICY "admin_all_schedules" ON public.schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('Admin','HR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('Admin','HR')
    )
  );

-- DSP: view own schedules
CREATE POLICY "dsp_own_schedules_select" ON public.schedules
  FOR SELECT USING (dsp_id = auth.uid());

-- DSP: respond to own pending schedules within 24 hours
CREATE POLICY "dsp_own_schedules_respond" ON public.schedules
  FOR UPDATE USING (
    dsp_id = auth.uid()
    AND status = 'pending'
    AND created_at > NOW() - INTERVAL '24 hours'
  );

CREATE INDEX IF NOT EXISTS idx_schedules_dsp    ON public.schedules(dsp_id);
CREATE INDEX IF NOT EXISTS idx_schedules_client ON public.schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date   ON public.schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);

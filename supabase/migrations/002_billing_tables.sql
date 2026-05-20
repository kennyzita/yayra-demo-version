-- RCS Billing Management tables

-- Clients (patients receiving care)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  dob DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Billing data for clients (PA schedules, weekly tracking, etc.)
CREATE TABLE IF NOT EXISTS public.billing_client_data (
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  archived BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Billing data for staff (pay rates, hours logs, etc.)
CREATE TABLE IF NOT EXISTS public.billing_staff_data (
  staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  archived BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- DSP-to-client assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dsp_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(dsp_id, client_id)
);

-- Profiles view: maps yayracare users to billing expected format
CREATE OR REPLACE VIEW public.profiles AS
SELECT id, first_name || ' ' || last_name AS full_name
FROM public.users;

-- User roles view: maps yayracare roles to billing expected format
CREATE OR REPLACE VIEW public.user_roles AS
SELECT
  u.id AS user_id,
  CASE r.name
    WHEN 'DSP'       THEN 'dsp'
    WHEN 'DSP Staff' THEN 'dsp'
    WHEN 'HR'        THEN 'supervisor'
    WHEN 'Admin'     THEN 'admin'
    ELSE 'dsp'
  END AS role
FROM public.users u
JOIN public.roles r ON u.role_id = r.id;

-- Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_client_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_staff_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Policies: any authenticated user can read/write (admin layout guards the route)
CREATE POLICY "auth_all_clients" ON public.clients
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_all_billing_client_data" ON public.billing_client_data
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_all_billing_staff_data" ON public.billing_staff_data
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_all_assignments" ON public.assignments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients(full_name);
CREATE INDEX IF NOT EXISTS idx_assignments_dsp_id ON public.assignments(dsp_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client_id ON public.assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_client_data_archived ON public.billing_client_data(archived);
CREATE INDEX IF NOT EXISTS idx_billing_staff_data_archived ON public.billing_staff_data(archived);

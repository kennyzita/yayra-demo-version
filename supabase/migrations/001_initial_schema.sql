-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
  storage_type TEXT NOT NULL DEFAULT 'supabase' CHECK (storage_type IN ('supabase', 's3', 'azure')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_affected TEXT,
  record_id UUID,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tenant_isolation_tenants" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "tenant_isolation_roles" ON public.roles
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "tenant_isolation_users" ON public.users
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "tenant_isolation_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON public.roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: seed default roles for a new tenant
CREATE OR REPLACE FUNCTION create_default_roles(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.roles (tenant_id, name, permissions, is_system_role) VALUES
  (p_tenant_id, 'Admin',     '{"all": true}', true),
  (p_tenant_id, 'HR',        '{"users":{"read":true,"write":true},"timesheets":{"read":true,"approve":true},"reports":{"read":true}}', true),
  (p_tenant_id, 'DSP Staff', '{"clients":{"read":true},"timesheets":{"read":true,"write":true},"case_notes":{"read":true,"write":true},"documents":{"read":true,"write":true}}', true),
  (p_tenant_id, 'DSP',       '{"clients":{"read":true},"timesheets":{"write":true},"case_notes":{"write":true}}', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

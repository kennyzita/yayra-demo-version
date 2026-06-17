-- Security hardening pass:
-- 1. Close a privilege-escalation hole: users could change their own role_id/tenant_id/status.
-- 2. Replace blanket "any authenticated user" policies on clients/billing/assignments/cert
--    expiries with ownership- and role-scoped policies (DSPs were able to read every
--    client's PHI and every staff member's billing data, and write to any of it).
-- 3. Split the DSP case_notes/timesheets policies by command so DSPs can no longer
--    modify or delete their own records once approved (timesheets) or once submitted
--    (case notes) — previously enforced only in the UI, not the database.

-- Shared helper: is the current user an Admin or HR?
CREATE OR REPLACE FUNCTION public.is_admin_or_hr()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('Admin', 'HR')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 1. Prevent self role/tenant/status escalation on public.users.
-- users_update_own (id = auth.uid()) has no WITH CHECK, so any authenticated
-- user could currently update their own role_id to Admin via the Supabase client.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'You cannot change your own role, tenant, or status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS users_prevent_self_role_escalation ON public.users;
CREATE TRIGGER users_prevent_self_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 2a. clients — DSPs may only see clients they're assigned to; writes are Admin/HR only.
DROP POLICY IF EXISTS "auth_all_clients" ON public.clients;

CREATE POLICY "select_clients" ON public.clients
  FOR SELECT USING (
    public.is_admin_or_hr()
    OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.client_id = clients.id AND a.dsp_id = auth.uid())
  );

CREATE POLICY "admin_insert_clients" ON public.clients
  FOR INSERT WITH CHECK (public.is_admin_or_hr());

CREATE POLICY "admin_update_clients" ON public.clients
  FOR UPDATE USING (public.is_admin_or_hr());

CREATE POLICY "admin_delete_clients" ON public.clients
  FOR DELETE USING (public.is_admin_or_hr());

-- 2b. billing_client_data — same ownership model as clients.
DROP POLICY IF EXISTS "auth_all_billing_client_data" ON public.billing_client_data;

CREATE POLICY "select_billing_client_data" ON public.billing_client_data
  FOR SELECT USING (
    public.is_admin_or_hr()
    OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.client_id = billing_client_data.client_id AND a.dsp_id = auth.uid())
  );

CREATE POLICY "admin_insert_billing_client_data" ON public.billing_client_data
  FOR INSERT WITH CHECK (public.is_admin_or_hr());

CREATE POLICY "admin_update_billing_client_data" ON public.billing_client_data
  FOR UPDATE USING (public.is_admin_or_hr());

CREATE POLICY "admin_delete_billing_client_data" ON public.billing_client_data
  FOR DELETE USING (public.is_admin_or_hr());

-- 2c. billing_staff_data — staff manage only their own row; Admin/HR manage all.
DROP POLICY IF EXISTS "auth_all_billing_staff_data" ON public.billing_staff_data;

CREATE POLICY "select_billing_staff_data" ON public.billing_staff_data
  FOR SELECT USING (staff_id = auth.uid() OR public.is_admin_or_hr());

CREATE POLICY "own_insert_billing_staff_data" ON public.billing_staff_data
  FOR INSERT WITH CHECK (staff_id = auth.uid() OR public.is_admin_or_hr());

CREATE POLICY "own_update_billing_staff_data" ON public.billing_staff_data
  FOR UPDATE USING (staff_id = auth.uid() OR public.is_admin_or_hr());

CREATE POLICY "admin_delete_billing_staff_data" ON public.billing_staff_data
  FOR DELETE USING (public.is_admin_or_hr());

-- 2d. assignments — DSPs see only their own assignments; only Admin/HR create/edit them.
DROP POLICY IF EXISTS "auth_all_assignments" ON public.assignments;

CREATE POLICY "select_assignments" ON public.assignments
  FOR SELECT USING (dsp_id = auth.uid() OR public.is_admin_or_hr());

CREATE POLICY "admin_insert_assignments" ON public.assignments
  FOR INSERT WITH CHECK (public.is_admin_or_hr());

CREATE POLICY "admin_update_assignments" ON public.assignments
  FOR UPDATE USING (public.is_admin_or_hr());

CREATE POLICY "admin_delete_assignments" ON public.assignments
  FOR DELETE USING (public.is_admin_or_hr());

-- 2e. staff_cert_expiries — same ownership model (writes only ever happen server-side
-- via the service role key today, but this closes the gap for any direct client access).
DROP POLICY IF EXISTS "auth_all_staff_cert_expiries" ON public.staff_cert_expiries;

CREATE POLICY "select_staff_cert_expiries" ON public.staff_cert_expiries
  FOR SELECT USING (staff_id = auth.uid() OR public.is_admin_or_hr());

CREATE POLICY "admin_insert_staff_cert_expiries" ON public.staff_cert_expiries
  FOR INSERT WITH CHECK (public.is_admin_or_hr());

CREATE POLICY "admin_update_staff_cert_expiries" ON public.staff_cert_expiries
  FOR UPDATE USING (public.is_admin_or_hr());

CREATE POLICY "admin_delete_staff_cert_expiries" ON public.staff_cert_expiries
  FOR DELETE USING (public.is_admin_or_hr());

-- 3a. case_notes — DSPs may only edit/delete their own notes while still a draft.
-- admin_all_case_notes (Admin/HR) is untouched and still grants full access.
DROP POLICY IF EXISTS "dsp_own_case_notes" ON public.case_notes;

CREATE POLICY "dsp_select_own_case_notes" ON public.case_notes
  FOR SELECT USING (dsp_id = auth.uid());

CREATE POLICY "dsp_insert_own_case_notes" ON public.case_notes
  FOR INSERT WITH CHECK (dsp_id = auth.uid());

CREATE POLICY "dsp_update_own_draft_case_notes" ON public.case_notes
  FOR UPDATE USING (dsp_id = auth.uid() AND status = 'draft')
  WITH CHECK (dsp_id = auth.uid());

CREATE POLICY "dsp_delete_own_draft_case_notes" ON public.case_notes
  FOR DELETE USING (dsp_id = auth.uid() AND status = 'draft');

-- 3b. timesheets — DSPs may edit/delete their own timesheet until it's approved,
-- matching the "Approved — no further changes allowed" rule already shown in the UI
-- (src/app/staff/timesheet/page.tsx) but previously not enforced in the database.
DROP POLICY IF EXISTS "dsp_own_timesheets" ON public.timesheets;

CREATE POLICY "dsp_select_own_timesheets" ON public.timesheets
  FOR SELECT USING (dsp_id = auth.uid());

CREATE POLICY "dsp_insert_own_timesheets" ON public.timesheets
  FOR INSERT WITH CHECK (dsp_id = auth.uid());

CREATE POLICY "dsp_update_own_timesheets" ON public.timesheets
  FOR UPDATE USING (dsp_id = auth.uid() AND status <> 'approved')
  WITH CHECK (dsp_id = auth.uid());

CREATE POLICY "dsp_delete_own_timesheets" ON public.timesheets
  FOR DELETE USING (dsp_id = auth.uid() AND status <> 'approved');

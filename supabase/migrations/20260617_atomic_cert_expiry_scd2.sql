-- The cert-expiry SCD2 write was done as two separate Supabase calls (expire old
-- row, then insert new row) from src/app/api/admin/scan-staff-expiries/route.ts.
-- A failure between the two calls leaves a staff member with no current row for
-- that cert type. Wrap both writes in a single function so they commit or roll
-- back together.
CREATE OR REPLACE FUNCTION public.upsert_cert_expiry_scd2(
  p_staff_id UUID,
  p_cert_type TEXT,
  p_expiry_date DATE,
  p_scanned_by UUID
) RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.staff_cert_expiries
  SET valid_to = v_now, is_current = false
  WHERE staff_id = p_staff_id AND cert_type = p_cert_type AND is_current = true;

  INSERT INTO public.staff_cert_expiries (staff_id, cert_type, expiry_date, scanned_by, valid_from, is_current)
  VALUES (p_staff_id, p_cert_type, p_expiry_date, p_scanned_by, v_now, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

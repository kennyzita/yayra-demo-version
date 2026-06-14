-- SCD2: normalized cert expiry table replacing billing_staff_data.data.docExpiries JSONB blob

CREATE TABLE IF NOT EXISTS public.staff_cert_expiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cert_type   TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  scanned_by  UUID REFERENCES auth.users(id),
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to    TIMESTAMPTZ,
  is_current  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one current row per cert type per staff member
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_cert_expiries_current
  ON public.staff_cert_expiries (staff_id, cert_type) WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_staff_cert_expiries_staff_id
  ON public.staff_cert_expiries (staff_id);

ALTER TABLE public.staff_cert_expiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_staff_cert_expiries" ON public.staff_cert_expiries
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Migrate existing docExpiries from billing_staff_data JSONB into the new table.
-- Applies CERT_CANONICAL mapping and keeps the earliest (most urgent) expiry
-- for front/back variants that share a canonical cert_type.
INSERT INTO public.staff_cert_expiries (staff_id, cert_type, expiry_date, valid_from, is_current)
SELECT
  staff_id,
  CASE cert_key
    WHEN 'Driver''s License / Identification - Front' THEN 'Driver''s License / Identification'
    WHEN 'Driver''s License / Identification - Back'  THEN 'Driver''s License / Identification'
    WHEN 'Driver''s License - Front'                  THEN 'Driver''s License / Identification'
    WHEN 'Driver''s License - Back'                   THEN 'Driver''s License / Identification'
    WHEN 'Driver''s License'                          THEN 'Driver''s License / Identification'
    WHEN 'EAD / Green card - Front'                   THEN 'EAD / Green card'
    WHEN 'EAD / Green card - Back'                    THEN 'EAD / Green card'
    ELSE cert_key
  END AS cert_type,
  MIN(cert_value::DATE) AS expiry_date,
  NOW() AS valid_from,
  TRUE AS is_current
FROM (
  SELECT
    bsd.staff_id,
    cert.key   AS cert_key,
    cert.value AS cert_value
  FROM public.billing_staff_data bsd,
    jsonb_each_text(bsd.data -> 'docExpiries') AS cert(key, value)
  WHERE bsd.data ? 'docExpiries'
    AND jsonb_typeof(bsd.data -> 'docExpiries') = 'object'
    AND cert.value ~ '^\d{4}-\d{2}-\d{2}$'
) raw
GROUP BY staff_id, cert_type
ON CONFLICT DO NOTHING;

-- Enables Supabase Realtime change feeds on billing_staff_data so the admin
-- Hiring page can auto-refresh when a DSP submits/updates an application,
-- instead of relying on a manual page reload or Refresh button click.
--
-- Realtime delivery is still gated by this table's existing RLS SELECT policy
-- (select_billing_staff_data) — a subscriber only receives change events for
-- rows they're allowed to SELECT.
--
-- Safe to re-run: ALTER PUBLICATION ... ADD TABLE errors if the table is
-- already a member, so guard with a catalog check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'billing_staff_data'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_staff_data;
  END IF;
END $$;

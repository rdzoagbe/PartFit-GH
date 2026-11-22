-- ============================================================================
-- PartFit Ghana — automated reservation expiry (Milestone 4: hardening & ops)
--
-- setup-all.sql already:
--   * sets orders.reservation_expires_at = now() + 48h when staff approve, and
--   * defines public.expire_partfit_approvals() for on-demand, staff-triggered
--     expiry.
--
-- What was missing is *automation*: nothing frees an approved-but-uncollected
-- reservation on its own, and the staff-triggered function can't run on a
-- schedule because a cron job has no auth.uid() to satisfy is_partfit_staff().
--
-- This migration adds a system expiry function (no staff check — it only ever
-- expires orders already past their own reservation window) and schedules it
-- with pg_cron.
--
-- GO-LIVE ONLY. Run once in the Supabase SQL editor when moving off the demo.
-- pg_cron must be enabled first (Supabase: Database → Extensions → pg_cron,
-- or the create-extension line below). Safe to re-run: it is idempotent.
-- ============================================================================

create extension if not exists pg_cron;

-- System-run expiry: SECURITY DEFINER, deliberately no is_partfit_staff() gate.
-- It can only move orders that are already 'approved' AND past their own
-- reservation_expires_at into 'expired', releasing the held stock, and records
-- an audit event for each one.
-- The function itself now lives in backend/order-integrity.sql, which is the
-- version that skips paid / in-flight payments and releases reserved stock.
-- It used to be defined HERE as well, which meant running this file after
-- order-integrity.sql silently reverted both of those safeguards — expiring
-- paid orders and leaking the stock they were holding. Do not redefine it here.

-- Only the database/cron owner runs this; never customers or staff clients.
revoke all on function public.expire_partfit_approvals_system() from public, anon, authenticated;

-- Schedule every 15 minutes (idempotent: drop any prior job of the same name first).
select cron.unschedule('partfit-expire-approvals')
 where exists (select 1 from cron.job where jobname = 'partfit-expire-approvals');

select cron.schedule(
  'partfit-expire-approvals',
  '*/15 * * * *',
  $$select public.expire_partfit_approvals_system();$$
);

-- Verify:  select * from cron.job where jobname = 'partfit-expire-approvals';
-- History: select * from cron.job_run_details order by start_time desc limit 20;

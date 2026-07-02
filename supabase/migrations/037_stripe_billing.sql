-- 037_stripe_billing.sql
--
-- Stripe billing foundation (battle plan session 4).
-- Pricing: single plan, $79/month or $790/year. Demo-led sales: admin activates
-- an account after a demo converts (creates customer + trialing subscription).
--
-- Idempotent — safe to re-run. Run manually in the Supabase SQL editor.

-- ── Billing state on the tenant row ──────────────────────────────────────────
ALTER TABLE funeral_homes ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE;
ALTER TABLE funeral_homes ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE funeral_homes ADD COLUMN IF NOT EXISTS subscription_status    TEXT
  CHECK (subscription_status IN ('trialing','active','past_due','canceled','suspended','none'))
  DEFAULT 'none';
ALTER TABLE funeral_homes ADD COLUMN IF NOT EXISTS billing_interval       TEXT
  CHECK (billing_interval IN ('month','year'));
ALTER TABLE funeral_homes ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ;
ALTER TABLE funeral_homes ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ;

-- ── Webhook event dedup (idempotent processing) ──────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_events (
  id              TEXT PRIMARY KEY,            -- Stripe event ID (evt_...)
  type            TEXT NOT NULL,
  processed_at    TIMESTAMPTZ DEFAULT NOW(),
  funeral_home_id UUID REFERENCES funeral_homes(id) ON DELETE SET NULL
);

-- GRANTS: this project does NOT auto-grant new tables to the Supabase roles
-- (see migrations 023/034 — missing grants caused "permission denied" outages).
-- service_role: webhook + admin writes. authenticated: superadmin reads via RLS.
GRANT ALL ON public.stripe_events TO service_role, authenticated;

-- RLS: superadmin-only. (FOR ALL with USING and no WITH CHECK — Postgres applies
-- the USING expression to writes as well.)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin only" ON stripe_events;
CREATE POLICY "Superadmin only" ON stripe_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

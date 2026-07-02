-- 038_twilio_webhook.sql
--
-- Inbound Twilio webhook support (battle plan session 8, audit H2): STOP/START
-- opt-out sync + delivery status receipts. Without this, users who text STOP
-- keep getting sends (TCPA risk) and sms_log 'sent' only means API-accepted.
--
-- Idempotent — safe to re-run. Run manually in the Supabase SQL editor.
-- ⚠️ Deploy ordering: run this BEFORE (or immediately with) the code deploy —
-- sendAndLogSms now writes sms_log.twilio_sid and reads profiles.sms_opted_out.

-- ── Opt-out state on profiles ────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_opted_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opted_out_at  TIMESTAMPTZ;

-- ── Twilio Message SID on sms_log (linchpin for delivery callbacks) ──────────
ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
CREATE INDEX IF NOT EXISTS idx_sms_log_twilio_sid ON sms_log(twilio_sid);

-- ── Widen the existing status CHECK (do NOT add a second status column) ──────
ALTER TABLE sms_log DROP CONSTRAINT IF EXISTS sms_log_status_check;
ALTER TABLE sms_log ADD CONSTRAINT sms_log_status_check
  CHECK (status IN ('pending','queued','sent','delivered','failed','undelivered','opted_out'));

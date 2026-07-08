-- 041_reminder_log.sql
--
-- Per-user daily-reminder timing (Session C). The overdue cron now runs hourly
-- and sends each user their reminder only in the hour matching their preferred
-- local time (notification_preferences.preferred_sms_hour + timezone).
--
-- This table is the sent-guard: one row per user per LOCAL calendar date. The
-- cron atomically claims a row before sending (upsert / ON CONFLICT DO NOTHING),
-- so a user can never receive the same daily reminder twice in one day — even
-- if the cron double-fires or a DST "fall back" repeats their preferred hour.
--
-- Written and read only by the cron (service role); no user-facing access.
-- Idempotent: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS reminder_log (
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reminder_date)
);

ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS, but tables still need an explicit GRANT.
GRANT ALL ON reminder_log TO service_role;

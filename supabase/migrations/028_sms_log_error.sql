-- Persist the failure reason on SMS sends (mirrors email_log.error_message).
ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS error_message text;

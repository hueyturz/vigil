-- 040_has_seen_welcome.sql
--
-- First-run welcome slideshow (onboarding redesign): a per-user flag so the
-- 4-step welcome modal shows once after the first login. Defaults FALSE so all
-- existing users see it once on their next dashboard visit; new signups get
-- FALSE and see it immediately, then it's flipped TRUE when the modal mounts.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN NOT NULL DEFAULT FALSE;

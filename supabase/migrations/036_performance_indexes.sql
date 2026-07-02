-- 036_performance_indexes.sql
--
-- Performance indexes from the 2026-07 production audit (finding H5).
-- Postgres does NOT auto-index foreign keys — every index below backs a hot
-- query path that currently sequential-scans:
--   • tasks by service (service detail, print, completion), by assignee
--     (my-tasks, staff filters), and by home+status (dashboard, /tasks, cron)
--   • services by home+status (services list, dashboard)
--   • log tables by home + newest-first (admin detail pages, dashboard activity)
--   • task_subtasks looked up by task_id (row expansion in TaskRow)
--   • pg_trgm GIN indexes so the Cmd+K search's ILIKE '%term%' queries can use
--     an index instead of scanning every row.
--
-- All statements are idempotent (IF NOT EXISTS) — safe to re-run.
-- Run manually in the Supabase SQL editor. No data changes; indexes only.

-- ── Task queries (most frequent hot path) ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_service_id          ON tasks(service_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id      ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_funeral_home_status ON tasks(funeral_home_id, status);

-- ── Service queries ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_services_funeral_home_status ON services(funeral_home_id, status);

-- ── Log tables (admin and reporting queries, newest-first) ───────────────────
CREATE INDEX IF NOT EXISTS idx_sms_log_funeral_home_created      ON sms_log(funeral_home_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_funeral_home_created    ON email_log(funeral_home_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_funeral_home_created ON activity_log(funeral_home_id, created_at DESC);

-- ── Subtask join table ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);

-- NOT added (redundant — do not add): task_tags(task_id) and
-- template_task_tags(template_task_id). Each is the LEADING column of that
-- table's composite primary key — PRIMARY KEY (task_id, tag_id) and
-- PRIMARY KEY (template_task_id, tag_id) — so the PK index already serves those
-- lookups; a separate index would be pure write overhead. (tag_id lookups are
-- covered by idx_task_tags_tag_id / idx_template_task_tags_tag_id from 031.)

-- ── Full-text search (the ILIKE search route) ────────────────────────────────
-- services has no 'name' column (deceased_name/family_name); the contacts table
-- is service_contacts; tasks are searched by title.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_services_deceased_name_trgm ON services USING GIN (deceased_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_service_contacts_name_trgm  ON service_contacts USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm            ON tasks USING GIN (title gin_trgm_ops);

-- ── Deliberately deferred (audit-flagged, lower traffic today) ───────────────
-- Enable these as volume grows; kept here so the decision is documented:
-- CREATE INDEX IF NOT EXISTS idx_sms_log_recipient_id ON sms_log(recipient_id);
-- CREATE INDEX IF NOT EXISTS idx_activity_log_service_id ON activity_log(service_id);
-- CREATE INDEX IF NOT EXISTS idx_task_template_subtasks_template_id ON task_template_subtasks(template_id);
-- CREATE INDEX IF NOT EXISTS idx_tasks_notes_trgm ON tasks USING GIN (notes gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);

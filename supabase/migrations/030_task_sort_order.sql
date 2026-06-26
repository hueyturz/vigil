-- 030_task_sort_order.sql
--
-- Ensure tasks have a sort_order column for drag-to-reorder within a category.
-- NOTE: tasks.sort_order already exists (created NOT NULL in 005_create_tasks.sql
-- and populated from template sort_order on generation). These statements are
-- written idempotently so running this migration is a safe no-op on existing data.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
UPDATE tasks SET sort_order = 0 WHERE sort_order IS NULL;

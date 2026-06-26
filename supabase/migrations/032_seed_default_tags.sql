-- 032_seed_default_tags.sql
--
-- Platform-wide default tags: shared across all funeral homes, never editable or
-- deletable by tenants. Marked is_default = true with funeral_home_id NULL.

-- ── Schema ──────────────────────────────────────────────────────────────────
-- Defaults have no owning funeral home, so funeral_home_id must allow NULL.
ALTER TABLE tags ALTER COLUMN funeral_home_id DROP NOT NULL;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- The existing UNIQUE (funeral_home_id, name) doesn't dedupe defaults (NULLs are
-- distinct), so add a partial unique index on the default name set.
CREATE UNIQUE INDEX IF NOT EXISTS tags_default_name_key ON tags(name) WHERE is_default;

-- ── Seed the 14 platform defaults (idempotent) ──────────────────────────────
INSERT INTO tags (funeral_home_id, name, color, is_default) VALUES
  (NULL, 'Body Preparation',    '#6B7280', true),
  (NULL, 'Transportation',      '#2563EB', true),
  (NULL, 'Documentation',       '#7C3AED', true),
  (NULL, 'Cremation',           '#DC2626', true),
  (NULL, 'Burial',              '#16A34A', true),
  (NULL, 'Family Contact',      '#D97706', true),
  (NULL, 'Flowers & Tributes',  '#DB2777', true),
  (NULL, 'Venue & Facility',    '#0891B2', true),
  (NULL, 'Legal & Permits',     '#EA580C', true),
  (NULL, 'Financial',           '#059669', true),
  (NULL, 'Obituary',            '#4F46E5', true),
  (NULL, 'Veterans Affairs',    '#1D4ED8', true),
  (NULL, 'Religious & Cultural','#9333EA', true),
  (NULL, 'Third-Party Vendor',  '#64748B', true)
ON CONFLICT (name) WHERE is_default DO NOTHING;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Replace the single 031 policy with granular ones: everyone can read defaults +
-- their own tags; only their own non-default tags can be written/deleted.
DROP POLICY IF EXISTS tags_all ON tags;

CREATE POLICY tags_select ON tags FOR SELECT
  USING (
    is_default = true
    OR funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY tags_insert ON tags FOR INSERT
  WITH CHECK (
    is_default = false
    AND funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY tags_update ON tags FOR UPDATE
  USING (
    is_default = false
    AND funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    is_default = false
    AND funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY tags_delete ON tags FOR DELETE
  USING (
    is_default = false
    AND funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

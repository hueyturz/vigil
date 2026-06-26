-- 031_tags.sql
--
-- Replace the rigid task "category" with a flexible per-funeral-home tag system.
-- Categories are dropped entirely (no migration path). NOTE: this codebase's
-- template table is `task_templates` (the spec's "template_tasks") — tag links to
-- templates therefore reference task_templates(id).

-- ── Drop categories ─────────────────────────────────────────────────────────
ALTER TABLE tasks          DROP COLUMN IF EXISTS category;
ALTER TABLE task_templates DROP COLUMN IF EXISTS category;

-- ── tags ────────────────────────────────────────────────────────────────────
CREATE TABLE tags (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  funeral_home_id uuid        NOT NULL REFERENCES funeral_homes(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  color           text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funeral_home_id, name)
);

CREATE INDEX idx_tags_funeral_home_id ON tags(funeral_home_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_all ON tags FOR ALL
  USING      (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

-- ── task_tags ───────────────────────────────────────────────────────────────
CREATE TABLE task_tags (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);

ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_tags_all ON task_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tags
    WHERE tags.id = task_tags.tag_id
      AND tags.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tags
    WHERE tags.id = task_tags.tag_id
      AND tags.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  ));

-- ── template_task_tags (template task = task_templates row) ──────────────────
CREATE TABLE template_task_tags (
  template_task_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  tag_id           uuid NOT NULL REFERENCES tags(id)           ON DELETE CASCADE,
  PRIMARY KEY (template_task_id, tag_id)
);

CREATE INDEX idx_template_task_tags_tag_id ON template_task_tags(tag_id);

ALTER TABLE template_task_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY template_task_tags_all ON template_task_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tags
    WHERE tags.id = template_task_tags.tag_id
      AND tags.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tags
    WHERE tags.id = template_task_tags.tag_id
      AND tags.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  ));

-- ── Rewrite generate_tasks_for_service ──────────────────────────────────────
-- No longer copies `category` (dropped). Copies each custom template task's tags
-- (template_task_tags) into the new task's task_tags. System default templates
-- have no tags, so the tag copy is simply a no-op for them.
CREATE OR REPLACE FUNCTION generate_tasks_for_service(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_funeral_home_id uuid;
  v_service_type    text;
  v_custom_count    int;
  v_template        RECORD;
  v_new_task_id     uuid;
BEGIN
  SELECT funeral_home_id, service_type
  INTO   v_funeral_home_id, v_service_type
  FROM   services
  WHERE  id = p_service_id;

  SELECT COUNT(*)
  INTO   v_custom_count
  FROM   task_templates
  WHERE  funeral_home_id = v_funeral_home_id
    AND  service_type    = v_service_type;

  FOR v_template IN
    SELECT t.id AS template_id, t.title, t.confirmation_hint,
           t.due_days_before, t.sort_order, t.priority, s.assigned_staff_id
    FROM   task_templates t
    JOIN   services s ON s.id = p_service_id
    WHERE  (
      (v_custom_count > 0 AND t.funeral_home_id = v_funeral_home_id)
      OR
      (v_custom_count = 0 AND t.funeral_home_id IS NULL)
    )
    AND t.service_type = v_service_type
    ORDER BY t.sort_order
  LOOP
    INSERT INTO tasks (
      service_id, funeral_home_id, title, confirmation_hint,
      due_days_before, sort_order, assigned_to_id, priority
    )
    VALUES (
      p_service_id,
      v_funeral_home_id,
      v_template.title,
      v_template.confirmation_hint,
      v_template.due_days_before,
      v_template.sort_order,
      v_template.assigned_staff_id,
      v_template.priority
    )
    RETURNING id INTO v_new_task_id;

    -- Copy any subtasks defined on this template task
    INSERT INTO task_subtasks (task_id, funeral_home_id, title, sort_order, is_complete)
    SELECT
      v_new_task_id,
      v_funeral_home_id,
      ts.title,
      ts.sort_order,
      false
    FROM task_template_subtasks ts
    WHERE ts.template_id = v_template.template_id;

    -- Carry the template task's tags onto the new task
    INSERT INTO task_tags (task_id, tag_id)
    SELECT v_new_task_id, tt.tag_id
    FROM template_task_tags tt
    WHERE tt.template_task_id = v_template.template_id;
  END LOOP;
END;
$func$;

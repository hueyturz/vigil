-- Phase A: custom task templates per funeral home

-- 1. Add funeral_home_id to task_templates (nullable — NULL means system default)
ALTER TABLE task_templates
  ADD COLUMN funeral_home_id uuid REFERENCES funeral_homes(id) ON DELETE CASCADE;

-- 2. Index for fast lookups by funeral home
CREATE INDEX idx_task_templates_funeral_home_id ON task_templates(funeral_home_id);

-- 3. Drop the old "all authenticated users can SELECT" policy and replace with
--    a scoped one: system templates OR templates owned by the user's funeral home.
DROP POLICY IF EXISTS "task_templates_select" ON task_templates;

CREATE POLICY "task_templates_select"
  ON task_templates FOR SELECT
  USING (
    funeral_home_id IS NULL
    OR funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "task_templates_insert"
  ON task_templates FOR INSERT
  WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );

CREATE POLICY "task_templates_update"
  ON task_templates FOR UPDATE
  USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );

CREATE POLICY "task_templates_delete"
  ON task_templates FOR DELETE
  USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );

-- 4. Update generate_tasks_for_service:
--    prefer custom templates (funeral_home_id = service's funeral_home_id);
--    fall back to system defaults (funeral_home_id IS NULL) if none found.
CREATE OR REPLACE FUNCTION generate_tasks_for_service(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_funeral_home_id uuid;
  v_service_type    text;
  v_custom_count    int;
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

  IF v_custom_count > 0 THEN
    -- Use this funeral home's custom templates
    INSERT INTO tasks (
      service_id, funeral_home_id, title, category, confirmation_hint,
      due_days_before, sort_order, assigned_to_id
    )
    SELECT
      p_service_id,
      v_funeral_home_id,
      t.title,
      t.category,
      t.confirmation_hint,
      t.due_days_before,
      t.sort_order,
      s.assigned_staff_id
    FROM task_templates t
    JOIN services s ON s.id = p_service_id
    WHERE t.funeral_home_id = v_funeral_home_id
      AND t.service_type    = v_service_type
    ORDER BY t.sort_order;
  ELSE
    -- Fall back to system defaults
    INSERT INTO tasks (
      service_id, funeral_home_id, title, category, confirmation_hint,
      due_days_before, sort_order, assigned_to_id
    )
    SELECT
      p_service_id,
      v_funeral_home_id,
      t.title,
      t.category,
      t.confirmation_hint,
      t.due_days_before,
      t.sort_order,
      s.assigned_staff_id
    FROM task_templates t
    JOIN services s ON s.id = p_service_id
    WHERE t.funeral_home_id IS NULL
      AND t.service_type    = v_service_type
    ORDER BY t.sort_order;
  END IF;
END;
$$;

ALTER TABLE task_templates
  ADD COLUMN priority text NOT NULL DEFAULT 'standard'
    CHECK (priority IN ('critical', 'standard', 'informational'));

ALTER TABLE tasks
  ADD COLUMN priority text NOT NULL DEFAULT 'standard'
    CHECK (priority IN ('critical', 'standard', 'informational'));

-- Mark critical system defaults
UPDATE task_templates SET priority = 'critical'
WHERE funeral_home_id IS NULL
  AND title IN (
    'Casket ordered',
    'Vault ordered',
    'Cemetery contacted & burial scheduled',
    'Cremation authorization signed',
    'Honor guard requested & confirmed',
    'VA burial benefits verified'
  );

CREATE OR REPLACE FUNCTION generate_tasks_for_service(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
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
    INSERT INTO tasks (
      service_id, funeral_home_id, title, category, confirmation_hint,
      due_days_before, sort_order, assigned_to_id, priority
    )
    SELECT
      p_service_id,
      v_funeral_home_id,
      t.title,
      t.category,
      t.confirmation_hint,
      t.due_days_before,
      t.sort_order,
      s.assigned_staff_id,
      t.priority
    FROM task_templates t
    JOIN services s ON s.id = p_service_id
    WHERE t.funeral_home_id = v_funeral_home_id
      AND t.service_type    = v_service_type
    ORDER BY t.sort_order;
  ELSE
    INSERT INTO tasks (
      service_id, funeral_home_id, title, category, confirmation_hint,
      due_days_before, sort_order, assigned_to_id, priority
    )
    SELECT
      p_service_id,
      v_funeral_home_id,
      t.title,
      t.category,
      t.confirmation_hint,
      t.due_days_before,
      t.sort_order,
      s.assigned_staff_id,
      t.priority
    FROM task_templates t
    JOIN services s ON s.id = p_service_id
    WHERE t.funeral_home_id IS NULL
      AND t.service_type    = v_service_type
    ORDER BY t.sort_order;
  END IF;
END;
$func$;

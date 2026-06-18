-- Replace generate_tasks_for_service to also copy task_template_subtasks
-- into task_subtasks for each newly created task.

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
    SELECT t.id AS template_id, t.title, t.category, t.confirmation_hint,
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
      service_id, funeral_home_id, title, category, confirmation_hint,
      due_days_before, sort_order, assigned_to_id, priority
    )
    VALUES (
      p_service_id,
      v_funeral_home_id,
      v_template.title,
      v_template.category,
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
  END LOOP;
END;
$func$;

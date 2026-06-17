-- Trigger function: create profile row on new auth user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, funeral_home_id, full_name, role)
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'funeral_home_id')::uuid,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: generate tasks for a newly created service
CREATE OR REPLACE FUNCTION generate_tasks_for_service(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO tasks (
    service_id,
    funeral_home_id,
    title,
    category,
    confirmation_hint,
    due_days_before,
    sort_order,
    assigned_to_id
  )
  SELECT
    p_service_id,
    s.funeral_home_id,
    t.title,
    t.category,
    t.confirmation_hint,
    t.due_days_before,
    t.sort_order,
    s.assigned_staff_id
  FROM task_templates t
  JOIN services s ON s.id = p_service_id
  WHERE t.service_type = s.service_type
  ORDER BY t.sort_order;
END;
$$;

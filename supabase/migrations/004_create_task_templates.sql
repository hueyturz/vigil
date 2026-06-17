CREATE TABLE task_templates (
  id                 uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type       text  NOT NULL CHECK (service_type IN ('full-burial', 'graveside', 'cremation', 'military')),
  title              text  NOT NULL,
  category           text  NOT NULL,
  confirmation_hint  text  NOT NULL,
  due_days_before    int   NOT NULL,
  sort_order         int   NOT NULL
);

CREATE TABLE tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id          uuid        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  funeral_home_id     uuid        NOT NULL REFERENCES funeral_homes(id),
  title               text        NOT NULL,
  category            text        NOT NULL,
  confirmation_hint   text        NOT NULL,
  due_days_before     int         NOT NULL,
  sort_order          int         NOT NULL,
  assigned_to_id      uuid        REFERENCES profiles(id),
  status              text        NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'complete')),
  confirmation_value  text,
  completed_by_id     uuid        REFERENCES profiles(id),
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

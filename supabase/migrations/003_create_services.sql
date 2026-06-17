CREATE TABLE services (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  funeral_home_id   uuid        NOT NULL REFERENCES funeral_homes(id),
  family_name       text        NOT NULL,
  deceased_name     text        NOT NULL,
  service_type      text        NOT NULL CHECK (service_type IN ('full-burial', 'graveside', 'cremation', 'military')),
  service_date      date        NOT NULL,
  location          text        NOT NULL,
  assigned_staff_id uuid        REFERENCES profiles(id),
  created_by_id     uuid        NOT NULL REFERENCES profiles(id),
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

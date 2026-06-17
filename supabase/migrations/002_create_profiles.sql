CREATE TABLE profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  funeral_home_id  uuid        NOT NULL REFERENCES funeral_homes(id),
  full_name        text        NOT NULL,
  role             text        NOT NULL CHECK (role IN ('owner', 'fd', 'staff')),
  phone            text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE funeral_homes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  phone       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

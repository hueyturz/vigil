ALTER TABLE services ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_email text;

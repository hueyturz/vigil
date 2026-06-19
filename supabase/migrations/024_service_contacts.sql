CREATE TABLE IF NOT EXISTS service_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  funeral_home_id uuid NOT NULL REFERENCES funeral_homes(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  relationship text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view service contacts" ON service_contacts
  FOR SELECT TO authenticated USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "members can insert service contacts" ON service_contacts
  FOR INSERT TO authenticated WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "members can update service contacts" ON service_contacts
  FOR UPDATE TO authenticated USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "members can delete service contacts" ON service_contacts
  FOR DELETE TO authenticated USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

GRANT ALL ON public.service_contacts TO authenticated;
GRANT ALL ON public.service_contacts TO service_role;

-- Migrate existing contact data from services table
INSERT INTO service_contacts (service_id, funeral_home_id, name, phone, email, is_primary)
SELECT
  s.id,
  s.funeral_home_id,
  s.contact_name,
  s.contact_phone,
  s.contact_email,
  true
FROM services s
WHERE s.contact_name IS NOT NULL
  AND s.contact_name != '';

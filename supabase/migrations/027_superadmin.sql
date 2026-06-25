-- Superadmin flag for platform operators (cross-tenant admin dashboard).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- Security: is_superadmin is readable by the user (existing profiles_select policy),
-- but must NEVER be writable from the client. Postgres RLS is row-level, not
-- column-level, and the existing profiles_update policy lets authenticated users
-- update their own row — which would allow self-escalation. Block any change to
-- is_superadmin unless it's made by a privileged role (service_role / migrations).
CREATE OR REPLACE FUNCTION prevent_superadmin_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'is_superadmin can only be changed by the service role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_superadmin_change_trg ON profiles;
CREATE TRIGGER prevent_superadmin_change_trg
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_superadmin_change();

-- Grant superadmin to the platform operator account.
UPDATE profiles SET is_superadmin = true
WHERE id = '64756dc8-c11a-45ec-98ae-ac3d45949242';

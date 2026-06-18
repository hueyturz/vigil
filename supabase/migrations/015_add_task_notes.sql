-- Add notes column to task_templates and tasks
ALTER TABLE task_templates ADD COLUMN notes text;
ALTER TABLE tasks          ADD COLUMN notes text;

-- Make service_type, service_date, and location nullable on services
ALTER TABLE services ALTER COLUMN service_type DROP NOT NULL;
ALTER TABLE services ALTER COLUMN service_date DROP NOT NULL;
ALTER TABLE services ALTER COLUMN location     DROP NOT NULL;

-- Recreate service_type check constraint to allow null
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_service_type_check;
ALTER TABLE services ADD CONSTRAINT services_service_type_check
  CHECK (service_type IS NULL OR service_type IN ('full-burial','graveside','cremation','military'));

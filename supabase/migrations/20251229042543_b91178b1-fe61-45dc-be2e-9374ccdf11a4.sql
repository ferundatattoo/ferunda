-- Move extensions to a dedicated schema for security best practices
-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_cron and pg_net to extensions schema
-- Note: pg_cron must remain in postgres database cron schema, can't be moved
-- pg_net will be recreated in extensions schema

-- For pg_net, we need to drop and recreate in proper schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net SCHEMA extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
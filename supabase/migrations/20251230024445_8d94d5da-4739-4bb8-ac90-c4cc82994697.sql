
-- Sprint 2A Part 1: Create and extend enums

-- Add new app_role values
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'artist';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'assistant';

-- Create policy_decision enum with all values including ALLOW_WITH_WARNING
DO $$ BEGIN
  CREATE TYPE policy_decision AS ENUM ('ALLOW', 'REVIEW', 'BLOCK', 'ALLOW_WITH_WARNING');
EXCEPTION
  WHEN duplicate_object THEN 
    -- If it exists, try to add the new value
    ALTER TYPE policy_decision ADD VALUE IF NOT EXISTS 'ALLOW_WITH_WARNING';
END $$;

-- Create deposit_state enum
DO $$ BEGIN
  CREATE TYPE deposit_state AS ENUM ('required', 'pending', 'paid', 'credited', 'applied', 'forfeited', 'refunded', 'waived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

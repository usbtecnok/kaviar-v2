-- Migration: Add city column and community_leaders table
-- Date: 2026-01-29

-- Step 1: Add city column to neighborhoods
ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Rio de Janeiro';

-- Update existing records to Rio de Janeiro
UPDATE neighborhoods SET city = 'Rio de Janeiro' WHERE city IS NULL;

-- Make city NOT NULL after setting defaults
ALTER TABLE neighborhoods ALTER COLUMN city SET NOT NULL;

-- Step 2: Create community_leaders table
CREATE TABLE IF NOT EXISTS community_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  leader_type VARCHAR(50) NOT NULL CHECK (leader_type IN (
    'PRESIDENTE_ASSOCIACAO',
    'LIDER_RELIGIOSO',
    'COMERCIANTE_LOCAL',
    'AGENTE_SAUDE',
    'EDUCADOR',
    'OUTRO'
  )),
  verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN (
    'PENDING',
    'VERIFIED',
    'REJECTED'
  )),
  verification_notes TEXT,
  verified_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  verified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_leaders_neighborhood ON community_leaders(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_community_leaders_community ON community_leaders(community_id);
CREATE INDEX IF NOT EXISTS idx_community_leaders_status ON community_leaders(verification_status);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_city ON neighborhoods(city);

-- Create updated_at trigger for community_leaders
CREATE OR REPLACE FUNCTION update_community_leaders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_community_leaders_updated_at
  BEFORE UPDATE ON community_leaders
  FOR EACH ROW
  EXECUTE FUNCTION update_community_leaders_updated_at();

-- Add audit log
COMMENT ON TABLE community_leaders IS 'Community leaders for neighborhood validation and reputation system';
COMMENT ON COLUMN community_leaders.leader_type IS 'Type of community leadership role';
COMMENT ON COLUMN community_leaders.verification_status IS 'Admin verification status';

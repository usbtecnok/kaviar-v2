-- Moto Passenger Compliance Gate: municipal validation per territory
-- Note: territory_id is TEXT (not UUID) matching operational_territories.id
CREATE TABLE IF NOT EXISTS moto_passenger_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id TEXT NOT NULL,
  municipality_name VARCHAR(200),
  consultation_date DATE,
  consulted_by_admin_id TEXT,
  prefecture_notes TEXT,
  protocol_number VARCHAR(100),
  document_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  approved_by_admin_id TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(territory_id)
);

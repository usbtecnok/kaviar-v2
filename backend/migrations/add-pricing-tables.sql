-- Migration: Add pricing tables and ride pricing
-- Date: 2026-01-12

-- Step 1: Create pricing_tables
CREATE TABLE pricing_tables (
  id VARCHAR PRIMARY KEY,
  neighborhood_id VARCHAR NOT NULL,
  base_fare DECIMAL(10,2) NOT NULL,
  per_km DECIMAL(10,2) NOT NULL,
  per_min DECIMAL(10,2) NOT NULL,
  minimum_fare DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
);

-- Step 2: Create ride_pricing
CREATE TABLE ride_pricing (
  id VARCHAR PRIMARY KEY,
  ride_id VARCHAR UNIQUE NOT NULL,
  pricing_version VARCHAR NOT NULL,
  neighborhood_id VARCHAR NOT NULL,
  community_id VARCHAR,
  base_fare DECIMAL(10,2) NOT NULL,
  distance_km DECIMAL(8,3) NOT NULL,
  duration_min INTEGER NOT NULL,
  modifiers TEXT, -- JSON
  final_fare DECIMAL(10,2) NOT NULL,
  driver_payout DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_id) REFERENCES rides(id)
);

-- Step 3: Create indexes
CREATE INDEX idx_pricing_tables_neighborhood ON pricing_tables(neighborhood_id, is_active);
CREATE INDEX idx_ride_pricing_ride ON ride_pricing(ride_id);
CREATE INDEX idx_ride_pricing_neighborhood ON ride_pricing(neighborhood_id);

-- Step 4: Insert sample pricing for testing (placeholder)
INSERT INTO pricing_tables (id, neighborhood_id, base_fare, per_km, per_min, minimum_fare, version) 
VALUES 
  ('pricing_default', 'default_neighborhood', 5.00, 2.50, 0.30, 8.00, 'v1.0'),
  ('pricing_copacabana', 'copacabana', 6.00, 3.00, 0.35, 10.00, 'v1.0');

-- Note: This migration adds pricing infrastructure
-- Pricing always anchored to Ride.neighborhoodId
-- Community modifiers applied via operational profile
-- Immutable pricing record per ride for auditability

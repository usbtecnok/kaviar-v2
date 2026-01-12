-- Migration: Add driver incentives table
-- Date: 2026-01-12

-- Step 1: Create driver_incentives table
CREATE TABLE driver_incentives (
  id VARCHAR PRIMARY KEY,
  ride_id VARCHAR NOT NULL,
  driver_id VARCHAR NOT NULL,
  community_id VARCHAR,
  operational_profile VARCHAR NOT NULL,
  incentive_type VARCHAR NOT NULL, -- PRIORITY_BONUS | PRIVATE_POOL | ACTIVATION
  value DECIMAL(10,2) NOT NULL,
  currency VARCHAR DEFAULT 'BRL',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_id) REFERENCES rides(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_driver_incentives_ride ON driver_incentives(ride_id);
CREATE INDEX idx_driver_incentives_driver ON driver_incentives(driver_id);
CREATE INDEX idx_driver_incentives_applied_at ON driver_incentives(applied_at);
CREATE INDEX idx_driver_incentives_type ON driver_incentives(incentive_type);

-- Step 3: Create unique constraint to prevent duplicate incentives per ride/driver
CREATE UNIQUE INDEX idx_driver_incentives_ride_driver ON driver_incentives(ride_id, driver_id);

-- Note: This migration adds driver incentives infrastructure
-- Incentives applied after pricing, before dispatch
-- Does not alter passenger pricing or ride_pricing table
-- Anti-abuse: 1 incentive per ride per driver
-- Daily caps enforced at application level

-- Migration: Add neighborhood_id to passengers table
-- Date: 2026-01-22
-- Purpose: Enable geofence metrics for passengers (Kaviar Gold System)

ALTER TABLE passengers ADD COLUMN neighborhood_id TEXT;

ALTER TABLE passengers
ADD CONSTRAINT passengers_neighborhood_id_fkey 
FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL;

CREATE INDEX idx_passengers_neighborhood_id ON passengers(neighborhood_id);

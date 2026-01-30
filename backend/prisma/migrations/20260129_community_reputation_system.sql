-- Community Reputation System (Blockchain-Light)
-- Task 20.1: Database Schema - Ledger e Tabelas Core

-- 1. Reputation Ledger (Append-Only, Immutable)
CREATE TABLE IF NOT EXISTS "community_reputation_ledger" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "driver_id" VARCHAR(255) NOT NULL,
  "community_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(50) NOT NULL,
  "event_data" JSONB NOT NULL DEFAULT '{}',
  "rating" INT,
  "passenger_id" VARCHAR(255),
  "ride_id" VARCHAR(255),
  "hash" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE,
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_reputation_driver_community" 
ON "community_reputation_ledger"("driver_id", "community_id");

CREATE INDEX IF NOT EXISTS "idx_reputation_event_type" 
ON "community_reputation_ledger"("event_type");

CREATE INDEX IF NOT EXISTS "idx_reputation_created_at" 
ON "community_reputation_ledger"("created_at" DESC);

COMMENT ON TABLE "community_reputation_ledger" IS 'Histórico imutável de reputação comunitária';
COMMENT ON COLUMN "community_reputation_ledger"."hash" IS 'Hash SHA-256 para garantir imutabilidade';

-- 2. Community Leaders (Validadores)
CREATE TABLE IF NOT EXISTS "community_leaders" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" VARCHAR(255) NOT NULL,
  "community_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "role" VARCHAR(100) NOT NULL,
  "validation_weight" INT DEFAULT 10,
  "is_active" BOOLEAN DEFAULT true,
  "verified_by" VARCHAR(255),
  "verified_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE,
  UNIQUE("user_id", "community_id")
);

CREATE INDEX IF NOT EXISTS "idx_leaders_community" 
ON "community_leaders"("community_id") WHERE is_active = true;

COMMENT ON TABLE "community_leaders" IS 'Lideranças comunitárias que podem validar motoristas';

-- 3. Driver Validations (Endorsements)
CREATE TABLE IF NOT EXISTS "driver_validations" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "driver_id" VARCHAR(255) NOT NULL,
  "community_id" VARCHAR(255) NOT NULL,
  "validator_id" VARCHAR(255) NOT NULL,
  "validator_type" VARCHAR(50) NOT NULL DEFAULT 'COMMUNITY_LEADER',
  "validation_weight" INT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE,
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE,
  FOREIGN KEY ("validator_id") REFERENCES "community_leaders"("id") ON DELETE CASCADE,
  UNIQUE("driver_id", "community_id", "validator_id")
);

CREATE INDEX IF NOT EXISTS "idx_validations_driver_community" 
ON "driver_validations"("driver_id", "community_id");

COMMENT ON TABLE "driver_validations" IS 'Validações de motoristas por lideranças';

-- 4. Driver Reputation Stats (Materialized View for Performance)
CREATE TABLE IF NOT EXISTS "driver_reputation_stats" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "driver_id" VARCHAR(255) NOT NULL,
  "community_id" VARCHAR(255) NOT NULL,
  "total_rides" INT DEFAULT 0,
  "avg_rating" DECIMAL(3, 2) DEFAULT 0,
  "validation_score" INT DEFAULT 0,
  "reputation_level" VARCHAR(50) DEFAULT 'NEW',
  "badge_type" VARCHAR(50) DEFAULT 'YELLOW',
  "first_ride_at" TIMESTAMP,
  "last_ride_at" TIMESTAMP,
  "incidents_count" INT DEFAULT 0,
  "updated_at" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE,
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE,
  UNIQUE("driver_id", "community_id")
);

CREATE INDEX IF NOT EXISTS "idx_reputation_stats_driver" 
ON "driver_reputation_stats"("driver_id");

CREATE INDEX IF NOT EXISTS "idx_reputation_stats_community" 
ON "driver_reputation_stats"("community_id");

CREATE INDEX IF NOT EXISTS "idx_reputation_stats_level" 
ON "driver_reputation_stats"("reputation_level");

COMMENT ON TABLE "driver_reputation_stats" IS 'Estatísticas agregadas de reputação (cache)';

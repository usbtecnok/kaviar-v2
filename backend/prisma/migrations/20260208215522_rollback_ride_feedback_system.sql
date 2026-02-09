-- Rollback Migration: Remove Ride Feedback System
-- Date: 2026-02-08
-- Reverts: 20260208215522_add_ride_feedback_system.sql

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================

-- Drop tables in reverse order (child first, parent last)
DROP TABLE IF EXISTS ride_feedback_sentiment_analysis CASCADE;
DROP TABLE IF EXISTS ride_feedbacks CASCADE;

-- Note: This rollback is safe because:
-- 1. Tables are new (no production data yet)
-- 2. CASCADE removes all foreign key constraints
-- 3. No impact on existing tables (rides, passengers remain unchanged)
-- 4. Prisma client will be regenerated after rollback

-- To apply this rollback:
-- psql $DATABASE_URL -f backend/prisma/migrations/20260208215522_rollback_ride_feedback_system.sql

-- Add admin_email column to admin_audit_logs (idempotent for schema drift recovery)
-- In production, the table was created without this column due to legacy startup DDL
-- The original migration used CREATE TABLE IF NOT EXISTS which did not ALTER existing tables

ALTER TABLE admin_audit_logs
ADD COLUMN IF NOT EXISTS admin_email TEXT;

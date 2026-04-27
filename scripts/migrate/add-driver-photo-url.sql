-- Migração: foto de perfil do motorista
-- Executar: psql $DATABASE_URL -f add-driver-photo-url.sql

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Migration: Central de Notificações KAVIAR (app_notifications)
-- Data: 2026-07-01
-- Descrição: Tabela persistente de notificações para passageiro e motorista.
--   Permite sino real consultando backend, independente de push.

CREATE TABLE IF NOT EXISTS app_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(30)  NOT NULL,          -- PASSENGER | DRIVER
  recipient_id   TEXT         NOT NULL,
  title          VARCHAR(200) NOT NULL,
  body           VARCHAR(500) NOT NULL DEFAULT '',
  type           VARCHAR(60)  NOT NULL DEFAULT 'system',  -- fixed_route_message | fixed_route_broadcast | fixed_route_direct | system
  source_type    VARCHAR(60)  NULL,
  source_id      TEXT         NULL,
  route_id       TEXT         NULL,
  reservation_id TEXT         NULL,
  data           JSONB        NULL,
  read_at        TIMESTAMP    NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT now(),
  expires_at     TIMESTAMP    NULL
);

-- Índice principal para listagem paginada e unread-count
CREATE INDEX IF NOT EXISTS idx_app_notifications_recipient
  ON app_notifications (recipient_type, recipient_id, created_at DESC);

-- Índice para filtragem de não lidas
CREATE INDEX IF NOT EXISTS idx_app_notifications_unread
  ON app_notifications (recipient_type, recipient_id, read_at)
  WHERE read_at IS NULL;

-- Índices auxiliares para navegação por rota/reserva
CREATE INDEX IF NOT EXISTS idx_app_notifications_route
  ON app_notifications (route_id)
  WHERE route_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_notifications_reservation
  ON app_notifications (reservation_id)
  WHERE reservation_id IS NOT NULL;

COMMENT ON TABLE app_notifications IS 'Central de notificações persistentes KAVIAR. Passageiro e Motorista consultam via API; push é camada separada.';
COMMENT ON COLUMN app_notifications.recipient_type IS 'PASSENGER ou DRIVER';
COMMENT ON COLUMN app_notifications.type IS 'fixed_route_message, fixed_route_broadcast, fixed_route_direct, system';
COMMENT ON COLUMN app_notifications.data IS 'JSON seguro com routeId, reservationId, messageId — sem token ou telefone';

CREATE TABLE IF NOT EXISTS fixed_route_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES driver_fixed_routes(id) ON DELETE CASCADE,
  reservation_id UUID NULL REFERENCES driver_fixed_route_reservations(id) ON DELETE SET NULL,
  sender_type VARCHAR(30) NOT NULL,
  sender_driver_id TEXT NULL,
  sender_passenger_id TEXT NULL,
  sender_admin_id TEXT NULL,
  recipient_type VARCHAR(40) NOT NULL,
  recipient_driver_id TEXT NULL,
  recipient_passenger_id TEXT NULL,
  message_code VARCHAR(60) NULL,
  message_text VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  metadata JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_fixed_route_messages_route_created
  ON fixed_route_messages(route_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fixed_route_messages_reservation_created
  ON fixed_route_messages(reservation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fixed_route_messages_recipient_driver_read
  ON fixed_route_messages(recipient_driver_id, read_at);

CREATE INDEX IF NOT EXISTS idx_fixed_route_messages_recipient_passenger_read
  ON fixed_route_messages(recipient_passenger_id, read_at);

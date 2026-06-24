CREATE TABLE IF NOT EXISTS ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides_v2(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('passenger', 'driver')),
  sender_id UUID NOT NULL,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('passenger', 'driver')),
  recipient_id UUID NOT NULL,
  message_code VARCHAR(40) NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_ride_messages_ride_created ON ride_messages(ride_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ride_messages_recipient_unread ON ride_messages(recipient_type, recipient_id, read_at);

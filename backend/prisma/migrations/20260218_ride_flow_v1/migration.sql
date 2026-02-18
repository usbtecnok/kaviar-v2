-- SPEC_RIDE_FLOW_V1 Migration
-- Adiciona tabelas para sistema de corridas em tempo real

-- Enum para status de corrida
CREATE TYPE ride_status AS ENUM (
  'requested',
  'offered',
  'accepted',
  'arrived',
  'in_progress',
  'completed',
  'canceled_by_passenger',
  'canceled_by_driver',
  'no_driver'
);

-- Enum para status de oferta
CREATE TYPE offer_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'expired',
  'canceled'
);

-- Enum para disponibilidade do motorista
CREATE TYPE driver_availability AS ENUM (
  'offline',
  'online',
  'busy'
);

-- Tabela de corridas V2 (SPEC_RIDE_FLOW_V1)
CREATE TABLE rides_v2 (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  passenger_id TEXT NOT NULL REFERENCES passengers(id),
  driver_id TEXT REFERENCES drivers(id),
  status ride_status NOT NULL DEFAULT 'requested',
  
  -- Origem e destino
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  origin_text TEXT,
  origin_neighborhood_id TEXT REFERENCES communities(id),
  
  dest_lat DECIMAL(10, 8) NOT NULL,
  dest_lng DECIMAL(11, 8) NOT NULL,
  destination_text TEXT,
  dest_neighborhood_id TEXT REFERENCES communities(id),
  
  -- Tipo de corrida
  ride_type TEXT DEFAULT 'normal',
  
  -- Idempotência
  idempotency_key TEXT,
  
  -- Audit timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  offered_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para rides_v2
CREATE INDEX idx_rides_v2_status ON rides_v2(status);
CREATE INDEX idx_rides_v2_passenger_id ON rides_v2(passenger_id);
CREATE INDEX idx_rides_v2_driver_id ON rides_v2(driver_id);
CREATE INDEX idx_rides_v2_idempotency_key ON rides_v2(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_rides_v2_created_at ON rides_v2(created_at DESC);

-- Tabela de ofertas de corrida
CREATE TABLE ride_offers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ride_id TEXT NOT NULL REFERENCES rides_v2(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  status offer_status NOT NULL DEFAULT 'pending',
  
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  
  -- Score de ranking (para debug)
  rank_score DECIMAL(10, 2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ride_offers
CREATE INDEX idx_ride_offers_ride_id ON ride_offers(ride_id);
CREATE INDEX idx_ride_offers_driver_id ON ride_offers(driver_id);
CREATE INDEX idx_ride_offers_status ON ride_offers(status);
CREATE INDEX idx_ride_offers_expires_at ON ride_offers(expires_at) WHERE status = 'pending';

-- Tabela de status do motorista
CREATE TABLE driver_status (
  driver_id TEXT PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  availability driver_availability NOT NULL DEFAULT 'offline',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de localização do motorista
CREATE TABLE driver_locations (
  driver_id TEXT PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para localização recente
CREATE INDEX idx_driver_locations_updated_at ON driver_locations(updated_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rides_v2_updated_at BEFORE UPDATE ON rides_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_offers_updated_at BEFORE UPDATE ON ride_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_status_updated_at BEFORE UPDATE ON driver_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_locations_updated_at BEFORE UPDATE ON driver_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE rides_v2 IS 'SPEC_RIDE_FLOW_V1: Corridas end-to-end com matching em tempo real';
COMMENT ON TABLE ride_offers IS 'SPEC_RIDE_FLOW_V1: Ofertas enviadas aos motoristas (1 por vez)';
COMMENT ON TABLE driver_status IS 'SPEC_RIDE_FLOW_V1: Status operacional do motorista (offline/online/busy)';
COMMENT ON TABLE driver_locations IS 'SPEC_RIDE_FLOW_V1: Última localização conhecida do motorista';

-- =====================================================
-- SISTEMA DE SERVIÇOS ESPECIAIS - EXTENSÃO MODULAR
-- =====================================================

-- 1. ENUM para tipos de serviço
CREATE TYPE service_type_enum AS ENUM (
  'STANDARD_RIDE',
  'COMMUNITY_RIDE', 
  'TOUR_GUIDE',
  'ELDERLY_ASSISTANCE',
  'SPECIAL_ASSISTANCE',
  'COMMUNITY_SERVICE'
);

-- 2. Adicionar service_type às corridas existentes
ALTER TABLE rides 
ADD COLUMN service_type service_type_enum DEFAULT 'STANDARD_RIDE' NOT NULL,
ADD COLUMN additional_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN service_notes TEXT;

-- 3. Adicionar habilitações aos motoristas
ALTER TABLE drivers
ADD COLUMN can_tour_guide BOOLEAN DEFAULT false,
ADD COLUMN can_elderly_assistance BOOLEAN DEFAULT false,
ADD COLUMN can_special_assistance BOOLEAN DEFAULT false,
ADD COLUMN can_community_service BOOLEAN DEFAULT false,
ADD COLUMN special_services_enabled_at TIMESTAMPTZ,
ADD COLUMN special_services_enabled_by TEXT;

-- 4. Tabela de configuração de serviços especiais
CREATE TABLE special_service_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type service_type_enum NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  base_additional_fee DECIMAL(10,2) DEFAULT 0.00,
  driver_bonus_multiplier DECIMAL(3,2) DEFAULT 1.00,
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  audit_level TEXT DEFAULT 'standard' CHECK (audit_level IN ('standard', 'enhanced', 'strict')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inserir configurações padrão
INSERT INTO special_service_configs (service_type, display_name, description, base_additional_fee, driver_bonus_multiplier, requires_approval, audit_level) VALUES
('STANDARD_RIDE', 'Corrida Padrão', 'Corrida comum do sistema', 0.00, 1.00, false, 'standard'),
('COMMUNITY_RIDE', 'Corrida Comunitária', 'Corrida dentro da comunidade local', 0.00, 1.20, false, 'standard'),
('TOUR_GUIDE', 'Guia Turístico', 'Motorista como guia local da região', 15.00, 1.50, false, 'enhanced'),
('ELDERLY_ASSISTANCE', 'Assistência a Idosos', 'Atendimento especializado para idosos', 8.00, 1.40, true, 'strict'),
('SPECIAL_ASSISTANCE', 'Assistência Especial', 'Atendimento para pessoas com necessidades especiais', 12.00, 1.60, true, 'strict'),
('COMMUNITY_SERVICE', 'Serviço Comunitário', 'Serviços para a comunidade local', 5.00, 1.30, false, 'enhanced');

-- 6. Tabela de auditoria de serviços especiais
CREATE TABLE special_service_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id),
  service_type service_type_enum NOT NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id),
  driver_was_enabled BOOLEAN NOT NULL,
  passenger_confirmed BOOLEAN DEFAULT false,
  driver_accepted_at TIMESTAMPTZ,
  additional_fee_charged DECIMAL(10,2),
  bonus_applied DECIMAL(10,2),
  audit_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Índices para performance
CREATE INDEX idx_rides_service_type ON rides(service_type);
CREATE INDEX idx_drivers_special_services ON drivers(can_tour_guide, can_elderly_assistance, can_special_assistance, can_community_service);
CREATE INDEX idx_special_audit_ride ON special_service_audit(ride_id);
CREATE INDEX idx_special_audit_driver ON special_service_audit(driver_id);
CREATE INDEX idx_special_audit_service_type ON special_service_audit(service_type);

-- 8. View para motoristas habilitados por serviço
CREATE VIEW drivers_by_service AS
SELECT 
  d.id,
  d.user_id,
  d.community_id,
  d.is_active,
  CASE 
    WHEN d.can_tour_guide THEN 'TOUR_GUIDE'
    WHEN d.can_elderly_assistance THEN 'ELDERLY_ASSISTANCE'
    WHEN d.can_special_assistance THEN 'SPECIAL_ASSISTANCE'
    WHEN d.can_community_service THEN 'COMMUNITY_SERVICE'
    ELSE 'STANDARD_RIDE'
  END as enabled_service_type,
  d.can_tour_guide,
  d.can_elderly_assistance,
  d.can_special_assistance,
  d.can_community_service
FROM drivers d
WHERE d.is_active = true;

-- 9. Função para verificar habilitação do motorista
CREATE OR REPLACE FUNCTION check_driver_service_eligibility(
  driver_uuid UUID,
  service_type_param service_type_enum
) RETURNS BOOLEAN AS $$
DECLARE
  driver_record RECORD;
BEGIN
  -- Buscar dados do motorista
  SELECT 
    can_tour_guide,
    can_elderly_assistance,
    can_special_assistance,
    can_community_service,
    is_active
  INTO driver_record
  FROM drivers 
  WHERE id = driver_uuid;
  
  -- Verificar se motorista existe e está ativo
  IF NOT FOUND OR NOT driver_record.is_active THEN
    RETURN false;
  END IF;
  
  -- Verificar habilitação por tipo de serviço
  CASE service_type_param
    WHEN 'STANDARD_RIDE', 'COMMUNITY_RIDE' THEN
      RETURN true; -- Todos podem fazer corridas padrão
    WHEN 'TOUR_GUIDE' THEN
      RETURN driver_record.can_tour_guide;
    WHEN 'ELDERLY_ASSISTANCE' THEN
      RETURN driver_record.can_elderly_assistance;
    WHEN 'SPECIAL_ASSISTANCE' THEN
      RETURN driver_record.can_special_assistance;
    WHEN 'COMMUNITY_SERVICE' THEN
      RETURN driver_record.can_community_service;
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 10. Função para calcular valor total com taxa adicional
CREATE OR REPLACE FUNCTION calculate_service_total(
  base_amount DECIMAL(10,2),
  service_type_param service_type_enum,
  custom_additional_fee DECIMAL(10,2) DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  config_fee DECIMAL(10,2);
  final_additional_fee DECIMAL(10,2);
BEGIN
  -- Buscar taxa padrão da configuração
  SELECT base_additional_fee INTO config_fee
  FROM special_service_configs
  WHERE service_type = service_type_param AND is_active = true;
  
  -- Usar taxa customizada se fornecida, senão usar padrão
  final_additional_fee := COALESCE(custom_additional_fee, config_fee, 0.00);
  
  RETURN base_amount + final_additional_fee;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger para auditoria automática
CREATE OR REPLACE FUNCTION audit_special_service_ride()
RETURNS TRIGGER AS $$
BEGIN
  -- Só auditar se for serviço especial
  IF NEW.service_type != 'STANDARD_RIDE' THEN
    INSERT INTO special_service_audit (
      ride_id,
      service_type,
      driver_id,
      driver_was_enabled,
      additional_fee_charged,
      audit_notes
    ) VALUES (
      NEW.id,
      NEW.service_type,
      NEW.driver_id,
      check_driver_service_eligibility(NEW.driver_id, NEW.service_type),
      NEW.additional_fee,
      'Auto-audit on ride creation'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_special_service
  AFTER INSERT ON rides
  FOR EACH ROW
  EXECUTE FUNCTION audit_special_service_ride();

-- 12. RLS para isolamento de dados
ALTER TABLE special_service_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_service_audit ENABLE ROW LEVEL SECURITY;

-- Política para configurações (todos podem ler configurações ativas)
CREATE POLICY "special_service_configs_read" ON special_service_configs
  FOR SELECT USING (is_active = true);

-- Política para auditoria (apenas dados da própria comunidade)
CREATE POLICY "special_service_audit_community" ON special_service_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rides r 
      JOIN drivers d ON r.driver_id = d.id
      WHERE r.id = special_service_audit.ride_id
      AND d.community_id = auth.jwt() ->> 'community_id'::text
    )
  );

-- 13. Comentários para documentação
COMMENT ON TYPE service_type_enum IS 'Tipos de serviço disponíveis no sistema';
COMMENT ON COLUMN rides.service_type IS 'Tipo de serviço da corrida - padrão STANDARD_RIDE';
COMMENT ON COLUMN rides.additional_fee IS 'Taxa adicional cobrada pelo serviço especial';
COMMENT ON COLUMN drivers.can_tour_guide IS 'Motorista habilitado para guia turístico';
COMMENT ON COLUMN drivers.can_elderly_assistance IS 'Motorista habilitado para assistência a idosos';
COMMENT ON TABLE special_service_configs IS 'Configurações globais dos serviços especiais';
COMMENT ON TABLE special_service_audit IS 'Auditoria completa de serviços especiais executados';

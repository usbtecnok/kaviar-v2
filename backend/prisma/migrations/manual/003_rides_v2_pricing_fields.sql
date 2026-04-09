-- Campos operacionais de pricing em rides_v2 (cache — fonte de verdade é ride_settlements)
-- Escritos APENAS pelo pricing-engine

ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS pricing_profile_id UUID;
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS quoted_price       DECIMAL(8,2);
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS locked_price       DECIMAL(8,2);
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS final_price        DECIMAL(8,2);
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS platform_fee       DECIMAL(8,2);
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS driver_earnings    DECIMAL(8,2);
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS territory_match    TEXT;

-- dest_neighborhood_id já existe no schema mas nunca é preenchido — nenhuma alteração necessária

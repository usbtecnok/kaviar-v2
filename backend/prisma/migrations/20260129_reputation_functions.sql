-- Community Reputation System - Functions and Triggers
-- Task 20.2: Database Functions - Cálculo Automático de Níveis

-- 1. Function to calculate reputation level
CREATE OR REPLACE FUNCTION calculate_reputation_level(
  p_total_rides INT,
  p_avg_rating DECIMAL,
  p_validation_score INT
) RETURNS VARCHAR AS $$
BEGIN
  -- GUARDIAN: 200+ rides, 4.9+ rating, validated
  IF p_total_rides >= 200 AND p_avg_rating >= 4.9 AND p_validation_score >= 10 THEN
    RETURN 'GUARDIAN';
  END IF;
  
  -- VERIFIED: 50+ rides OR validated by leader
  IF (p_total_rides >= 50 AND p_avg_rating >= 4.7) OR p_validation_score >= 10 THEN
    RETURN 'VERIFIED';
  END IF;
  
  -- ACTIVE: 10+ rides, 4.5+ rating
  IF p_total_rides >= 10 AND p_avg_rating >= 4.5 THEN
    RETURN 'ACTIVE';
  END IF;
  
  -- NEW: default
  RETURN 'NEW';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Function to get badge type
CREATE OR REPLACE FUNCTION get_badge_type(p_level VARCHAR) RETURNS VARCHAR AS $$
BEGIN
  CASE p_level
    WHEN 'GUARDIAN' THEN RETURN 'DIAMOND';
    WHEN 'VERIFIED' THEN RETURN 'GOLD';
    WHEN 'ACTIVE' THEN RETURN 'GREEN';
    ELSE RETURN 'YELLOW';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger to update reputation stats after ride completion
CREATE OR REPLACE FUNCTION update_reputation_after_ride() RETURNS TRIGGER AS $$
DECLARE
  v_driver_community_id VARCHAR;
  v_rating DECIMAL;
  v_existing_stats RECORD;
BEGIN
  -- Only process completed rides
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get driver's community
    SELECT community_id INTO v_driver_community_id
    FROM drivers WHERE id = NEW.driver_id;
    
    -- Skip if driver has no community assigned
    IF v_driver_community_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get rating (assume 5.0 if no rating yet)
    v_rating := 5.0;
    
    -- Get existing stats
    SELECT * INTO v_existing_stats
    FROM driver_reputation_stats
    WHERE driver_id = NEW.driver_id AND community_id = v_driver_community_id;
    
    -- Update or insert reputation stats
    IF FOUND THEN
      -- Update existing stats
      UPDATE driver_reputation_stats
      SET 
        total_rides = total_rides + 1,
        avg_rating = ((avg_rating * total_rides) + v_rating) / (total_rides + 1),
        last_ride_at = NEW.updated_at,
        updated_at = NOW()
      WHERE driver_id = NEW.driver_id AND community_id = v_driver_community_id;
    ELSE
      -- Insert new stats
      INSERT INTO driver_reputation_stats (
        id, driver_id, community_id, total_rides, avg_rating, 
        first_ride_at, last_ride_at, updated_at
      )
      VALUES (
        gen_random_uuid()::text,
        NEW.driver_id,
        v_driver_community_id,
        1,
        v_rating,
        NEW.created_at,
        NEW.updated_at,
        NOW()
      );
    END IF;
    
    -- Update reputation level and badge
    UPDATE driver_reputation_stats
    SET 
      reputation_level = calculate_reputation_level(total_rides, avg_rating, validation_score),
      badge_type = get_badge_type(calculate_reputation_level(total_rides, avg_rating, validation_score))
    WHERE driver_id = NEW.driver_id AND community_id = v_driver_community_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_reputation_after_ride ON rides;

CREATE TRIGGER trigger_update_reputation_after_ride
AFTER UPDATE ON rides
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION update_reputation_after_ride();

COMMENT ON FUNCTION calculate_reputation_level IS 'Calcula nível de reputação baseado em corridas, rating e validações';
COMMENT ON FUNCTION get_badge_type IS 'Retorna tipo de badge baseado no nível de reputação';
COMMENT ON FUNCTION update_reputation_after_ride IS 'Atualiza estatísticas de reputação após conclusão de corrida';

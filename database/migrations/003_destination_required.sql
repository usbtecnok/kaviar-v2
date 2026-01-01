-- =====================================================
-- MIGRATION: GARANTIR destination_location OBRIGATÓRIO
-- =====================================================

-- Garantir que destination_location existe e é obrigatório
ALTER TABLE rides 
ALTER COLUMN destination_location SET NOT NULL;

-- Adicionar constraint de validação básica
ALTER TABLE rides 
ADD CONSTRAINT check_destination_not_empty 
CHECK (LENGTH(TRIM(destination_location)) > 0);

-- Comentário
COMMENT ON CONSTRAINT check_destination_not_empty ON rides IS 'Destino não pode ser vazio';

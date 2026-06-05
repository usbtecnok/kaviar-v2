-- =====================================================================
-- Seed 008: Pisos territoriais — Zona Sul / Rocinha / Vidigal
-- GESTOR: Paula (Zona Sul RJ)
-- 
-- IMPORTANTE:
--   - NÃO EXECUTAR SEM AUTORIZAÇÃO
--   - Substituir :territory_id pelo UUID real do território Zona Sul
--   - Substituir :rocinha_id pelo neighborhood_id real da Rocinha
--   - Substituir :vidigal_id pelo neighborhood_id real do Vidigal
--   - Substituir dest_neighborhood_id pelos IDs reais quando disponíveis
--
-- REGRA DE NEGÓCIO:
--   preço_final = MAX(preço_calculado_pelo_engine, floor_price + surcharge)
--
-- REGRA DO GESTOR:
--   "Acima do Largo Santinho, todas as corridas têm acréscimo de R$ 5,00,
--    exceto Largo das Flores e Leblon."
--
-- IMPLEMENTAÇÃO:
--   Linhas com surcharge = 5.00 representam origem "Rocinha Alta" (acima Largo Santinho)
--   Linhas com surcharge = 0 representam origem "Rocinha Baixa / Largo das Flores"
--   Exceções (sem acréscimo mesmo de Rocinha Alta): Leblon e Largo das Flores
--
-- ROLLBACK: DELETE FROM territory_price_floors WHERE territory_id = :territory_id;
-- =====================================================================

-- ─── ROCINHA BAIXA (Largo das Flores) → Destinos ────────────────────────────
-- Sem acréscimo (surcharge = 0)

INSERT INTO territory_price_floors
  (territory_id, origin_label, origin_neighborhood_id, dest_label, dest_neighborhood_id, floor_price, surcharge, notes, created_by)
VALUES
  (:territory_id, 'Rocinha', :rocinha_id, 'Leblon',                      NULL, 30.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Alto Leblon',                 NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Chácara do Céu',             NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Ipanema',                     NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Arpoador',                    NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Copacabana',                  NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Leme',                        NULL, 45.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Shopping Rio Sul',            NULL, 50.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Urca',                        NULL, 55.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Lagoa até Clube Naval',       NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Lagoa depois do Clube Naval', NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Lagoa até Parque da Catacumba', NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Lagoa depois Parque Catacumba', NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Baixo Gávea / Miguel Couto', NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Alto Gávea',                  NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'São Conrado',                 NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Rocinha / Largo das Flores',  NULL, 30.00, 0, 'Corrida interna', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Rocinha até Curva do S',      NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Rocinha até 99 Sushi',        NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Parque da Cidade',            NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Parque da Cidade Museu',      NULL, 45.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Jardim Botânico até Clube Naval', NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Horto',                       NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Aeroporto Santos Dumont',     NULL, 100.00, 0, 'Preço premium aeroporto', 'seed'),
  (:territory_id, 'Rocinha', :rocinha_id, 'Galeão',                      NULL, 130.00, 0, 'Preço premium aeroporto', 'seed');

-- ─── ROCINHA ALTA (acima do Largo Santinho) → Destinos ──────────────────────
-- Acréscimo de R$ 5,00 (surcharge = 5.00)
-- EXCEÇÕES: Leblon (surcharge = 0) e Largo das Flores (surcharge = 0)

INSERT INTO territory_price_floors
  (territory_id, origin_label, origin_neighborhood_id, dest_label, dest_neighborhood_id, floor_price, surcharge, notes, created_by)
VALUES
  -- EXCEÇÕES (sem acréscimo mesmo saindo de Rocinha Alta)
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Leblon',                      NULL, 30.00, 0, 'Exceção: Leblon sem acréscimo mesmo de Rocinha Alta', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Rocinha / Largo das Flores',  NULL, 30.00, 0, 'Exceção: Largo das Flores sem acréscimo', 'seed'),

  -- COM ACRÉSCIMO (+R$ 5,00)
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Alto Leblon',                 NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Chácara do Céu',             NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Ipanema',                     NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Arpoador',                    NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Copacabana',                  NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Leme',                        NULL, 45.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Shopping Rio Sul',            NULL, 50.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Urca',                        NULL, 55.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Lagoa até Clube Naval',       NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Lagoa depois do Clube Naval', NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Baixo Gávea / Miguel Couto', NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Alto Gávea',                  NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'São Conrado',                 NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Rocinha até Curva do S',      NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Rocinha até 99 Sushi',        NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Parque da Cidade',            NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Parque da Cidade Museu',      NULL, 45.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Jardim Botânico até Clube Naval', NULL, 35.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Horto',                       NULL, 40.00, 5.00, 'Acréscimo Rocinha Alta (+R$5)', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Aeroporto Santos Dumont',     NULL, 100.00, 5.00, 'Acréscimo Rocinha Alta (+R$5) - Aeroporto', 'seed'),
  (:territory_id, 'Rocinha Alta', :rocinha_id, 'Galeão',                      NULL, 130.00, 5.00, 'Acréscimo Rocinha Alta (+R$5) - Aeroporto', 'seed');

-- ─── VIDIGAL → Destinos ─────────────────────────────────────────────────────
-- Mesma tabela base (Vidigal é vizinho da Rocinha, mesma operação)

INSERT INTO territory_price_floors
  (territory_id, origin_label, origin_neighborhood_id, dest_label, dest_neighborhood_id, floor_price, surcharge, notes, created_by)
VALUES
  (:territory_id, 'Vidigal', :vidigal_id, 'Leblon',                      NULL, 30.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Alto Leblon',                 NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Ipanema',                     NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Arpoador',                    NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Copacabana',                  NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Leme',                        NULL, 45.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Shopping Rio Sul',            NULL, 50.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Urca',                        NULL, 55.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Lagoa até Clube Naval',       NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Lagoa depois do Clube Naval', NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Baixo Gávea / Miguel Couto', NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Alto Gávea',                  NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'São Conrado',                 NULL, 35.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Parque da Cidade',            NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Horto',                       NULL, 40.00, 0, 'Tabela base gestor Zona Sul', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Aeroporto Santos Dumont',     NULL, 100.00, 0, 'Preço premium aeroporto', 'seed'),
  (:territory_id, 'Vidigal', :vidigal_id, 'Galeão',                      NULL, 130.00, 0, 'Preço premium aeroporto', 'seed');

-- =====================================================================
-- RESUMO DO SEED:
--   Rocinha Baixa: 25 destinos × surcharge 0
--   Rocinha Alta:  24 destinos × surcharge 5 (exceções: Leblon + Largo das Flores sem acréscimo)
--   Vidigal:       17 destinos × surcharge 0
--   Total:         66 linhas
--
-- PARA ATIVAR:
--   1. Substituir :territory_id, :rocinha_id, :vidigal_id pelos UUIDs reais
--   2. Rodar migration 007 primeiro (cria a tabela)
--   3. Executar este seed
--   4. Validar com GET /api/admin/territory-floors?territory_id=xxx
--
-- PARA REVERTER:
--   DELETE FROM territory_price_floors WHERE territory_id = :territory_id;
-- =====================================================================

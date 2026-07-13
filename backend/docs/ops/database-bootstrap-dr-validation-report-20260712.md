# INFRA 5C.4.1 - Fechamento de equivalencia operacional DR (2026-07-12)

## Escopo

Validacao local em PostgreSQL 15 + PostGIS 3.4 (Docker), sem commit/push/deploy e sem escrita em RDS.

## Distincao de status

- Bootstrap mechanism proven: PASS.
- Operational DR equivalence proven: PASS nesta revisao 5C.4.1, apos triagem de diferencas e inclusao de objetos obrigatorios fora do Prisma.

## Correcoes aplicadas no pacote DR

Arquivo atualizado: `backend/prisma/bootstrap/20260712_current/post-prisma-objects.sql`

Objetos adicionados:
- admin_audit_logs + indices
- admin_login_history + indices
- driver_referral_log + indices
- territory_price_floors + indices + constraints de status/faixa de valores
- retorno_familiar_policy
- retorno_familiar_requests + indices
- funcao/trigger update_updated_at_column + triggers de rides_v2, ride_offers, driver_status, driver_locations
- funcao/trigger set_updated_at_mrcl
- funcao/trigger set_updated_at_municipal_regulations
- funcao/trigger set_updated_at_municipal_regulation_requirements
- funcao/trigger set_updated_at_municipal_authorizations
- funcao/trigger set_updated_at_operational_insurance_coverages
- manutencao dos dois partial indexes 5E:
  - municipal_regulatory_driver_protocols_case_driver_null_modality
  - municipal_authorizations_open_manual_draft_key

Arquivo atualizado: `backend/scripts/bootstrap-new-database.sh`

Ajustes:
- validacao de existencia de tabelas obrigatorias fora do Prisma:
  - admin_audit_logs
  - admin_login_history
  - driver_referral_log
  - territory_price_floors
  - retorno_familiar_policy
  - retorno_familiar_requests
- validacao de existencia dos 9 triggers obrigatorios observados em producao
- filtro de drift Prisma mantendo fail-closed para diferencas nao esperadas e ignorando apenas objetos extras intencionais do post-prisma

## Evidencias de execucao

Bancos de prova:
- kaviar_dr_equivalence_run1
- kaviar_dr_equivalence_run2

Resultados:
- run1: PASS
  - No pending migrations to apply.
  - Database schema is up to date!
  - Prisma diff is empty
  - Post-prisma required objects validated
  - bootstrap success
- run2: PASS
  - mesmas evidencias de run1
- rerun no run1: PASS (fail-closed)
  - ABORT: database is not empty
- snapshot run1 antes/depois do rerun: identico
- snapshot run1 x run2: identico

## Reclassificacao DR x producao

Arquivo: `/tmp/kaviar-dr-eq-vs-prod-diff.json`

### MISSING_IN_DR_BASELINE (restante)

Somente 4 objetos:
- credit_purchases (BASE TABLE)
- neighborhood_stats (VIEW)
- ride_feedback_sentiment_analysis (BASE TABLE)
- ride_feedbacks (BASE TABLE)

Classificacao:
- RUNTIME_REQUIRED = 0
- SECURITY_REQUIRED = 0
- AUDIT_REQUIRED = 0
- DATA_INTEGRITY_REQUIRED = 0
- LEGACY_STILL_REFERENCED = 0
- UNKNOWN_BLOCKER = 0
- DEAD_LEGACY / VIEW_DERIVED_NONESSENTIAL = 4

### EXTRA_IN_DR_BASELINE

- local_support_drivers
- local_support_invites

Classificacao:
- SCHEMA_AHEAD_OF_PRODUCTION (objetos no schema atual e com consumidores ativos no backend)

## Smokes funcionais locais (dados sinteticos)

- Prisma Client: connect + SELECT 1: PASS
- Build backend (`npm run build`): PASS
- admin_audit_logs insert/read: PASS
- admin_login_history insert/read: PASS
- driver_credit_purchases CRUD minimo: PASS
- territory_price_floors CRUD minimo: PASS

Observacao: smokes em transacao com rollback.

## Conclusao

Pacote DR aprovado para equivalencia operacional local no contexto definido (bootstrap de banco vazio + objetos obrigatorios de runtime/auditoria/integridade + checks fail-closed). Diferencas remanescentes com producao ficaram restritas a legado morto/objeto derivado nao essencial e a drift de producao frente ao schema atual.

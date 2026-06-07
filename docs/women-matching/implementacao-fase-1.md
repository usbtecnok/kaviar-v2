# Implementação Fase 1 — Preferência por Motorista Mulher

**Status:** Implementado (flag OFF)
**Branch:** `feat/women-driver-preference`
**Dispatch alterado:** NÃO

## Componentes

| Arquivo | Função |
|---|---|
| `011_women_driver_preference.sql` | Migration (campos + tabela de eventos) |
| `women-matching-consent.service.ts` | Service transacional (opt-in/out + eventos) |
| `passenger-women-preference.ts` | Endpoints passageira |
| `driver-women-preference.ts` | Endpoints motorista |
| `app.ts` | Registro de rotas |
| `schema.prisma` | Modelos atualizados |

## Feature flags

- `WOMEN_DRIVER_PREFERENCE_ENABLED=false` — dispatch ignora preferência
- `WOMEN_DRIVER_PREFERENCE_PILOT_TERRITORIES=` — territórios habilitados (vazio = nenhum)

## Endpoints

### Passageira (`/api/v2/passengers/me/women-preference`)
- GET / — status + feature_enabled
- POST /opt-in — aderir (consent_version obrigatório)
- POST /opt-out — revogar
- PUT /default — ativar/desativar preferência padrão

### Motorista (`/api/v2/drivers/me/women-preference`)
- GET / — status
- POST /opt-in — aderir
- POST /opt-out — revogar

## Idempotência

- opt-in com mesma versão = noop
- opt-out já inativo = noop
- default sem mudança = noop
- Eventos criados APENAS em mudança real

## Transações

Toda mudança: BEGIN → UPDATE entidade → INSERT evento → COMMIT (ou ROLLBACK)

## O que NÃO faz

- Não altera dispatch
- Não altera corridas
- Não ativa ninguém automaticamente
- Não altera pricing/créditos
- Não altera push/realtime

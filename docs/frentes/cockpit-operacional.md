# Cockpit Operacional

> Status da frente operacional do admin KAVIAR.
> Atualizado em 2026-06-25.

## Fase 4A — Relatório Diário por Território

**Status:** concluída e validada em produção.

### Escopo entregue

- Seção **Relatório diário** disponível em `/admin/operations`.
- Endpoint read-only:
  - `GET /api/admin/operations/daily-report?date=YYYY-MM-DD&territory_id=...`
- Filtro por território funcionando no Cockpit Operacional.
- Visão geral consolidada funcionando quando o território é limpo.
- Agregação diária calculada direto no banco, sem depender das listas truncadas do cockpit ao vivo.
- Corridas contabilizadas pelo território de origem.
- Corridas cross-territory entram no relatório do território de origem.

### Validação de produção

- Commit: `d88c174b7e054f9849969f4f831ecac5d82e4245`
- Deploy backend: GitHub Actions `Deploy Backend` success.
- Deploy frontend/admin: GitHub Actions `Deploy Frontend` success.
- Backend health: `200 OK`.
- `/admin/operations`: carregando em produção.
- Validação visual confirmada:
  - seção **Relatório diário** aparece dentro do Cockpit Operacional;
  - filtro por território funciona;
  - limpar território exibe visão geral consolidada;
  - cards carregam sem erro;
  - valores financeiros zerados fazem sentido quando não há corrida concluída/liquidada.

### Regra financeira

O relatório financeiro da Fase 4A usa `ride_settlements` como fonte de verdade:

- `final_revenue_cents` vem de `ride_settlements.final_price`;
- `kaviar_fee_cents` vem de `ride_settlements.fee_amount`;
- `driver_earnings_cents` vem de `ride_settlements.driver_earnings`.

Corridas concluídas sem settlement contam como corridas concluídas, mas não inventam valores financeiros.

### Proteções mantidas

A Fase 4A não alterou:

- wallet;
- pricing;
- dispatch;
- emergency status;
- fluxo de corrida.

## Fase 4B — Exportação / Resumo Operacional do Relatório Diário

**Status:** concluída e validada em produção.

### Escopo entregue

- Botão **Copiar resumo** disponível na seção **Relatório diário** em `/admin/operations`.
- Resumo gerado a partir do payload já carregado por `/api/admin/operations/daily-report`.
- Nenhum endpoint novo.
- Nenhuma alteração em agregações financeiras.
- Nenhuma alteração backend.

### Validação de produção

- Commit: `2ed65245c84e27c2d08958749c0ba824fa2dd68a`
- Deploy frontend/admin: GitHub Actions `Deploy Frontend` success.
- Backend health: `200 OK`.
- CloudWatch `ERROR`: sem eventos novos após deploy.
- Validação visual confirmada:
  - botão **Copiar resumo** aparece na seção **Relatório diário**;
  - clique no botão mostra **Resumo copiado.**;
  - texto copiado contém data, território, métricas operacionais, valores financeiros e observação cross-territory;
  - valores financeiros zerados aparecem corretamente quando não há corrida concluída/liquidada.

### Proteções mantidas

A Fase 4B não alterou:

- wallet;
- pricing;
- dispatch;
- emergency status;
- settlement;
- permissões;
- fluxo de corrida.

## Fase 4C — Exportação CSV simples do Relatório Diário

**Status:** concluída e validada em produção.

### Escopo entregue

- Botão **Exportar CSV** disponível na seção **Relatório diário** em `/admin/operations`.
- CSV gerado a partir do payload já carregado por `/api/admin/operations/daily-report`.
- Exportação de uma linha por relatório atual.
- Exportação limitada a métricas agregadas.
- Nenhum endpoint novo.
- Nenhuma alteração backend.

### Validação de produção

- Commit: `ae6112de2a1967bd210f9f9855cf9439eaf9950d`
- Deploy frontend/admin: GitHub Actions `Deploy Frontend` run `28183063229` success.
- Backend não iniciou, esperado porque a alteração foi somente em `frontend-app/**`.
- `/admin/operations`: `200 OK`.
- Bundle publicado `/assets/index-DXbI0wFs.js` contém:
  - `Exportar CSV`;
  - `kaviar-relatorio-diario`;
  - `sem_motorista_ou_oferta`;
  - `media_ate_primeira_oferta`;
  - `final_revenue_cents`.
- Backend health: `200 OK`.
- CloudWatch `ERROR`: sem eventos novos após deploy.

### Proteções mantidas

A Fase 4C não alterou:

- wallet;
- pricing;
- dispatch;
- emergency status;
- settlement;
- permissões;
- fluxo de corrida.

A exportação CSV não inclui telefone, passageiro, motorista ou qualquer dado pessoal.

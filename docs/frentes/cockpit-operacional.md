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

## Próxima Frente Sugerida

### Fase 4B — Relatório por Gestor / Exportação Operacional

Escopo pequeno e read-only:

- botão para exportar CSV ou copiar resumo;
- visão simples para gestor territorial;
- resumo diário por território;
- reaproveitar o endpoint diário já validado quando fizer sentido;
- não alterar wallet, pricing, dispatch, emergency status ou fluxo de corrida.

Critérios mínimos:

- manter `/admin/operations` estável;
- respeitar escopo territorial já existente;
- não retornar telefone em exportação de relatório, salvo decisão explícita posterior;
- cobrir contrato básico do payload/exportação em teste focado.

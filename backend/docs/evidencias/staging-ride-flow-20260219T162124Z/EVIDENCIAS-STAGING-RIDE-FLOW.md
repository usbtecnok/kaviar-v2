# Evidências — STAGING Ride Flow (CloudWatch)

- Data UTC: 2026-02-19T16:21:36Z
- Log group: `/ecs/kaviar-backend`
- Janela: start=2026-02-19T12:21:24-03:00 / end=2026-02-19T13:21:24-03:00
- Pasta evidências: `docs/evidencias/staging-ride-flow-20260219T162124Z`

## Arquivos gerados
- `anexos/cloudwatch-rideflow-query.json` (resultado bruto CloudWatch Logs Insights)
- `anexos/cloudwatch-rideflow-messages.txt` (mensagens extraídas)
- `anexos/cloudwatch-markers-counts.txt` (contagem de marcadores)
- `anexos/cloudwatch-api-v2-rides.json` (opcional: chamadas `/api/v2/rides`)

## Contagem de marcadores (CloudWatch)
```
Window: start=2026-02-19T12:21:24-03:00 end=2026-02-19T13:21:24-03:00

RIDE_CREATED:      60
DISPATCHER_FILTER: 81
DISPATCH_CANDIDATES: 81
OFFER_SENT:        21
OFFER_EXPIRED:     21
STATUS_CHANGED:    0
```

## Como isso fecha o checklist
Esta evidência comprova em **staging**:
- criação de corridas (RIDE_CREATED),
- dispatcher rodando (DISPATCHER_FILTER/DISPATCH_CANDIDATES),
- ofertas enviadas e expiradas (OFFER_SENT/OFFER_EXPIRED), quando aplicável,
- transições de status (STATUS_CHANGED), quando houver.

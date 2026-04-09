# Marco: Asaas em Produção — 2026-04-08

## Status: ✅ PRODUÇÃO OFICIAL

Feature de compra de créditos via Pix (Asaas) em produção real, validada ponta a ponta.

## Componentes ativos

| Componente | Estado | Referência |
|---|---|---|
| Backend | Task def `kaviar-backend:252` | `ASAAS_BASE_URL=https://api.asaas.com/v3` |
| Webhook | Ativo no painel Asaas produção | `https://api.kaviar.com.br/api/webhooks/asaas` |
| APK motorista | v16 público | `https://downloads.kaviar.com.br/kaviar-motorista-v16.apk` |
| Frontend | Deploy S3 + CloudFront | Commit `4a9c9ed` |
| EAS build | Commit `cb1e94d` | Build `0d3b5f9c-27f5-4e15-9177-96596098c644` |

## Teste real validado

| Item | Valor |
|---|---|
| Driver | `driver_1773052109702_h2stisw01` (Aparecido Goes) |
| Customer Asaas (prod) | `cus_000170143407` |
| Payment | `pay_6fp48yrwt5nq3jcz` |
| Valor | R$ 20,00 → 10 créditos |
| Saldo | 40 → 50 |
| Webhook | `PAYMENT_RECEIVED` → `processed` |
| Idempotência | ✅ Reenvio = `duplicate`, saldo inalterado |

## Rollback

- Backend: `aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --task-definition kaviar-backend:251 --force-new-deployment --region us-east-2`
- APK: `kaviar-motorista-v15.apk` permanece no R2

## Fase atual: OBSERVAÇÃO E ESTABILIZAÇÃO

## Comportamento: Pix não pago

- Sem pagamento = sem crédito. Purchase fica `pending`. Seguro.
- O webhook handler só processa `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`.
- Qualquer outro evento do Asaas é ignorado (retorna 200 sem ação).

### Melhoria futura

- Tratar eventos de expiração/vencimento no webhook para marcar purchases não pagas como `expired`.
- Objetivo: manter histórico limpo. Não é urgente — o estado atual é seguro.

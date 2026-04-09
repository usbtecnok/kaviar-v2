# Asaas → Produção: Runbook de Virada

**Data planejada:** 2026-04-08
**Objetivo:** Trocar Asaas de sandbox para produção de forma controlada, validar com 1 motorista e 1 compra real pequena.

---

## Estado Atual (sandbox — task def rev 251)

| Variável | Valor atual |
|---|---|
| `ASAAS_BASE_URL` | `https://api-sandbox.asaas.com/v3` |
| `ASAAS_API_KEY` | `$aact_hmlg_...` (homologação) |
| `ASAAS_WEBHOOK_TOKEN` | `whsec_fPWyRcl-...` |

## Pré-requisitos

- [ ] API key de **produção** gerada no painel Asaas (conta de produção, NÃO sandbox)
  - A chave começa com `$aact_prod_` (não `$aact_hmlg_`)
  - Guardar em local seguro — o Asaas só exibe na geração
- [ ] Novo `ASAAS_WEBHOOK_TOKEN` gerado (token forte, mínimo 32 chars)
- [ ] Motorista de teste identificado (ID, nome, CPF cadastrado)

---

## Etapa 1 — Gerar credenciais

### 1.1 Gerar novo webhook token

```bash
# Gerar token forte
openssl rand -base64 32
# Exemplo: kT9xR2mN7pLqW4vB8jF1cY6hA3sD0eZu5iO+gXwU=
```

Anotar o valor gerado. Será usado em 2 lugares:
- Env `ASAAS_WEBHOOK_TOKEN` no ECS
- Campo "Token" no webhook do painel Asaas

### 1.2 Obter API key de produção

1. Acessar https://www.asaas.com (NÃO sandbox.asaas.com)
2. Configurações → Integrações → API
3. Gerar nova chave (ou usar existente de produção)
4. Confirmar que começa com `$aact_prod_` ou `$aact_Yjc...` (produção)
5. **NÃO** usar chave que contenha `hmlg` no prefixo

---

## Etapa 2 — Deploy do backend

Usar o script `scripts/deploy/deploy-asaas-production.sh`:

```bash
export ASAAS_PROD_API_KEY="<chave de produção>"
export ASAAS_PROD_WEBHOOK_TOKEN="<token gerado no passo 1.1>"

bash scripts/deploy/deploy-asaas-production.sh
```

O script:
1. Busca a task definition atual
2. Substitui as 3 envs do Asaas (BASE_URL, API_KEY, WEBHOOK_TOKEN)
3. Registra nova task definition
4. Faz force-new-deployment
5. Aguarda estabilização

### Valores que serão aplicados

| Variável | Novo valor |
|---|---|
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` |
| `ASAAS_API_KEY` | `$ASAAS_PROD_API_KEY` |
| `ASAAS_WEBHOOK_TOKEN` | `$ASAAS_PROD_WEBHOOK_TOKEN` |

---

## Etapa 3 — Configurar webhook no painel Asaas

1. Acessar https://www.asaas.com → Configurações → Integrações → Webhooks
2. Criar novo webhook:
   - **URL:** `https://api.kaviar.com.br/api/webhooks/asaas`
   - **Eventos:** `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`
   - **Token de autenticação:** mesmo valor de `ASAAS_PROD_WEBHOOK_TOKEN`
   - **Versão da API:** v3
3. Salvar e testar (o Asaas envia um ping)

---

## Etapa 4 — Validar deploy

```bash
# Health check
curl -s https://api.kaviar.com.br/health | jq .

# Verificar logs do ECS
aws logs tail /ecs/kaviar-backend --since 5m --region us-east-2 | grep -i asaas
```

---

## Etapa 5 — Teste real controlado

### 5.1 Preparação
- Motorista de teste: `__DRIVER_ID__` (preencher)
- Confirmar que o motorista tem CPF cadastrado (`document_cpf` NOT NULL)
- APK usado: `__APK_VERSION__` (preencher)

### 5.2 Executar compra

1. Motorista abre o app → Créditos → Comprar pacote menor
2. App exibe QR Pix → motorista paga com banco real (valor pequeno)

### 5.3 Checklist de validação

```sql
-- 1. Purchase criada com status pending
SELECT id, status, credits_amount, amount_cents, asaas_payment_id, created_at
FROM driver_credit_purchases
WHERE driver_id = '__DRIVER_ID__'
ORDER BY created_at DESC LIMIT 1;

-- 2. Webhook recebido
SELECT id, event_type, status, asaas_payment_id, created_at, processed_at
FROM asaas_webhook_events
ORDER BY created_at DESC LIMIT 5;

-- 3. Purchase confirmada
SELECT id, status, paid_at
FROM driver_credit_purchases
WHERE driver_id = '__DRIVER_ID__' AND status = 'confirmed'
ORDER BY created_at DESC LIMIT 1;

-- 4. Saldo atualizado
SELECT balance FROM credit_balance WHERE driver_id = '__DRIVER_ID__';

-- 5. Ledger correto
SELECT id, delta, balance_after, reason, idempotency_key, created_at
FROM driver_credit_ledger
WHERE driver_id = '__DRIVER_ID__'
ORDER BY created_at DESC LIMIT 5;

-- 6. Idempotência: reenviar webhook manualmente e confirmar que NÃO credita duas vezes
-- (verificar que asaas_webhook_events mostra status='duplicate' no reenvio)
```

### 5.4 Resultado esperado

- [ ] Cobrança Pix criada no Asaas produção
- [ ] QR Code pagável por banco real
- [ ] Webhook `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED` recebido
- [ ] `driver_credit_purchases.status` = `confirmed`
- [ ] `credit_balance.balance` incrementado corretamente
- [ ] `driver_credit_ledger` com entrada correta e `idempotency_key`
- [ ] Reenvio do webhook NÃO duplica créditos

---

## Etapa 6 — Registrar evidências

Preenchido em 2026-04-08:

| Item | Valor |
|---|---|
| Commit do deploy | `f253bede` (image: `asaas-qr-fix-20260408021334`) |
| Task definition revision | `kaviar-backend:252` |
| APK usado | EAS build commit `cb1e94d` |
| Driver ID testado | `driver_1773052109702_h2stisw01` (Aparecido Goes) |
| Asaas customer (prod) | `cus_000170143407` |
| Asaas payment ID | `pay_6fp48yrwt5nq3jcz` |
| Valor pago (R$) | R$ 20,00 (2000 cents) |
| Créditos recebidos | 10 (pacote pkg-10) |
| Saldo antes | 40.00 |
| Saldo depois | 50.00 |
| Webhook event ID | `dc5fcefc-f38c-488b-85ce-04ea40864a1e` |
| Webhook status | `PAYMENT_RECEIVED` → `processed` |
| Horário compra | 2026-04-08T22:13:10Z (19:13 BRT) |
| Horário webhook | 2026-04-08T22:14:18Z (19:14 BRT) |
| Idempotência | ✅ Reenvio marcado como `duplicate`, saldo manteve 50.00 |

---

## Rollback (se necessário)

```bash
# Voltar para sandbox
export ASAAS_PROD_API_KEY="<chave sandbox anterior>"
export ASAAS_PROD_WEBHOOK_TOKEN="whsec_fPWyRcl-_EX924StGHs_XjNVvlJrhVqnwADticVuAIA"
export ASAAS_BASE_URL_OVERRIDE="https://api-sandbox.asaas.com/v3"

bash scripts/deploy/deploy-asaas-production.sh
```

Ou reverter para task def 251:
```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:251 \
  --force-new-deployment \
  --region us-east-2
```

---

## Regras

- **NÃO** reutilizar token de webhook do sandbox
- **NÃO** misturar chave sandbox com URL de produção (401 garantido)
- **NÃO** abrir para todos os motoristas antes do teste real passar
- **NÃO** atualizar APK público antes de confirmar teste com APK correto
- Após validação completa, planejar abertura gradual

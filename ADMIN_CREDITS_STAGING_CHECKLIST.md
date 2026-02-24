# Admin Driver Credits - Checklist de Validação Staging

**Branch:** `feat/admin-driver-credits`  
**Hash:** `46ea1d740649505977797544e889dbe9d581819b`  
**Data:** 2026-02-23  
**Ambiente:** STAGING ONLY (produção proibida)

---

## 📋 Implementação Completa

### Backend ✅
- [x] Migration `20260223_add_driver_credits_system.sql`
  - Tabela `credit_balance` (saldo por motorista)
  - Tabela `driver_credit_ledger` (log imutável)
  - Índices de performance
  - Constraints de integridade
- [x] Função `applyCreditDelta()` transacional e idempotente
- [x] 3 endpoints admin:
  - `GET /api/admin/drivers/:driverId/credits/balance`
  - `GET /api/admin/drivers/:driverId/credits/ledger`
  - `POST /api/admin/drivers/:driverId/credits/adjust`

### Frontend ✅
- [x] Componente `DriverCreditsCard`
  - Card com saldo atual
  - Tabela de ledger paginada
  - Modal de ajuste de créditos
  - RBAC (admin-only via `authenticateAdmin`)
- [x] Integrado na página `DriverDetail`

---

## 🧪 Checklist de Validação em Staging

### 1. Endpoints Backend

#### 1.1 GET Balance
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging-api.kaviar.com/api/admin/drivers/123/credits/balance
```
**Esperado:**
```json
{
  "balance": 0,
  "updated_at": null
}
```

#### 1.2 POST Adjust (Adicionar Créditos)
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": 50.00,
    "reason": "Bônus de boas-vindas",
    "idempotencyKey": "test-add-50-001"
  }' \
  https://staging-api.kaviar.com/api/admin/drivers/123/credits/adjust
```
**Esperado:**
```json
{
  "success": true,
  "alreadyProcessed": false,
  "balance": 50.00
}
```

#### 1.3 GET Ledger
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://staging-api.kaviar.com/api/admin/drivers/123/credits/ledger?page=1&limit=10"
```
**Esperado:**
```json
{
  "entries": [
    {
      "id": 1,
      "delta": "50.00",
      "balance_after": "50.00",
      "reason": "Bônus de boas-vindas",
      "admin_user_id": 1,
      "created_at": "2026-02-23T..."
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### 2. Idempotência

#### 2.1 Teste de Idempotência (mesma chave)
```bash
# Enviar novamente com mesma idempotencyKey
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": 50.00,
    "reason": "Bônus de boas-vindas",
    "idempotencyKey": "test-add-50-001"
  }' \
  https://staging-api.kaviar.com/api/admin/drivers/123/credits/adjust
```
**Esperado:**
```json
{
  "success": true,
  "alreadyProcessed": true,
  "balance": 50.00
}
```
**Validação:** Saldo permanece 50.00 (não duplica)

### 3. Concorrência

#### 3.1 Teste de Concorrência (múltiplas requisições simultâneas)
```bash
# Executar 5 requisições em paralelo com chaves diferentes
for i in {1..5}; do
  curl -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"delta\": 10.00,
      \"reason\": \"Teste concorrência $i\",
      \"idempotencyKey\": \"concurrent-test-$i\"
    }" \
    https://staging-api.kaviar.com/api/admin/drivers/123/credits/adjust &
done
wait
```
**Validação:**
- Saldo final = 50.00 + (5 × 10.00) = 100.00
- Ledger tem 6 entradas (1 inicial + 5 novas)
- Nenhuma transação perdida ou duplicada

### 4. RBAC (Role-Based Access Control)

#### 4.1 Teste com Token de Admin
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging-api.kaviar.com/api/admin/drivers/123/credits/balance
```
**Esperado:** Status 200 + dados

#### 4.2 Teste sem Token
```bash
curl https://staging-api.kaviar.com/api/admin/drivers/123/credits/balance
```
**Esperado:** Status 401 Unauthorized

#### 4.3 Teste com Token de Motorista (não-admin)
```bash
curl -H "Authorization: Bearer $DRIVER_TOKEN" \
  https://staging-api.kaviar.com/api/admin/drivers/123/credits/balance
```
**Esperado:** Status 403 Forbidden

### 5. UI Admin (Prints Obrigatórios)

#### 5.1 Card de Créditos
- [ ] Print do card mostrando saldo atual
- [ ] Print da tabela de ledger com transações
- [ ] Print da paginação funcionando

#### 5.2 Modal de Ajuste
- [ ] Print do modal aberto
- [ ] Print de ajuste positivo (adicionar créditos)
- [ ] Print de ajuste negativo (remover créditos)
- [ ] Print de mensagem de sucesso

#### 5.3 Validações de UI
- [ ] Print de erro ao tentar delta = 0
- [ ] Print de erro ao tentar motivo vazio
- [ ] Print de atualização automática após ajuste

### 6. Integridade de Dados

#### 6.1 Verificar Consistência no Banco
```sql
-- Verificar que balance = última entrada do ledger
SELECT 
  cb.driver_id,
  cb.balance as balance_table,
  dcl.balance_after as ledger_last_balance
FROM credit_balance cb
LEFT JOIN LATERAL (
  SELECT balance_after 
  FROM driver_credit_ledger 
  WHERE driver_id = cb.driver_id 
  ORDER BY created_at DESC 
  LIMIT 1
) dcl ON true
WHERE cb.balance != dcl.balance_after;
```
**Esperado:** 0 linhas (nenhuma inconsistência)

#### 6.2 Verificar Constraint de Saldo Não-Negativo
```bash
# Tentar criar saldo negativo
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": -200.00,
    "reason": "Teste saldo negativo",
    "idempotencyKey": "test-negative-balance"
  }' \
  https://staging-api.kaviar.com/api/admin/drivers/123/credits/adjust
```
**Esperado:** Status 500 + erro de constraint violation

---

## 📦 Entregáveis

### Commits
- ✅ `8062446` - Backend (migrations + API transacional)
- ✅ `46ea1d7` - Admin UI (card + ledger + modal)

### Evidências Staging
- [ ] Outputs dos 3 endpoints (balance, ledger, adjust)
- [ ] Teste de idempotência (mesma chave 2x)
- [ ] Teste de concorrência (5 requisições paralelas)
- [ ] Teste de RBAC (admin vs não-admin)
- [ ] 6 prints da UI (card, tabela, modal, validações)
- [ ] Query SQL de integridade

---

## 🚫 Restrições

- ❌ **Produção proibida** até validação completa
- ❌ **Feature flags OFF** por padrão
- ✅ **Staging-only** para testes
- ✅ **Rollback fácil** (migrations reversíveis)

---

## 📝 Notas

- Migration é **staging-only** (não aplicar em produção ainda)
- Função `applyCreditDelta()` usa transações SQL para garantir atomicidade
- Idempotência via `idempotency_key` único no ledger
- RBAC via middleware `authenticateAdmin` (já existente)
- UI integrada na página de detalhes do motorista (não cria nova rota)

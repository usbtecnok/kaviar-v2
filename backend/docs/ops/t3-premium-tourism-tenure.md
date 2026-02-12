# T3: Premium Turismo por Tempo de Casa (6 meses)

**Data:** 2026-02-11 23:55 BRT  
**Status:** ✅ BACKEND IMPLEMENTADO (aguardando frontend + deploy)

---

## Objetivo

Promover motoristas para KAVIAR Premium (combos turísticos) somente após 6 meses ativos na plataforma.

---

## Backend Implementado

### 1. Prisma Schema

**Campos adicionados:**
```prisma
model drivers {
  // ... campos existentes ...
  active_since                DateTime?
  premium_tourism_status      String    @default("standard")
  premium_tourism_promoted_at DateTime?
  
  @@index([active_since])
  @@index([premium_tourism_status])
}
```

**Valores `premium_tourism_status`:**
- `standard` (default)
- `premium`

---

### 2. Endpoint: PATCH /api/admin/drivers/:id/activate

**Mudança:**
- Ao ativar motorista pela primeira vez, seta `active_since = now()`
- Se `active_since` já existe, **não sobrescreve** (tempo de casa não reseta)

**Response:**
```json
{
  "success": true,
  "driver": {
    "id": "driver-123",
    "status": "active",
    "activeSince": "2026-02-11T23:00:00.000Z"
  }
}
```

---

### 3. Endpoint: GET /api/admin/drivers/:id/premium-eligibility

**Auth:** allowReadAccess (admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "driverId": "driver-123",
    "status": "active",
    "activeSince": "2026-02-11T23:00:00.000Z",
    "monthsActive": 0,
    "requiredMonths": 6,
    "eligibleByTime": false,
    "docsOk": null,
    "termsOk": null,
    "eligible": false,
    "currentPremiumTourismStatus": "standard"
  }
}
```

**Lógica:**
- `monthsActive = floor(diffDays / 30)`
- `requiredMonths = 6` (env: `PREMIUM_TOURISM_MIN_MONTHS`)
- `eligibleByTime = monthsActive >= 6`
- `eligible = eligibleByTime && status === 'active'`
- `docsOk`, `termsOk`: null (placeholder para validação futura)

---

### 4. Endpoint: PATCH /api/admin/drivers/:id/promote-premium-tourism

**Auth:** requireSuperAdmin

**Validações:**
1. `status !== 'active'` → 400 "Driver not active"
2. `!active_since` → 400 "ActiveSince not set"
3. `monthsActive < 6` → 403 "Not eligible: requires 6 months active (current: X)"
4. `premium_tourism_status === 'premium'` → 409 "Already premium"

**Response (sucesso):**
```json
{
  "success": true,
  "data": {
    "driverId": "driver-123",
    "premiumTourismStatus": "premium",
    "promotedAt": "2026-02-11T23:55:00.000Z"
  }
}
```

**Ação:**
- Seta `premium_tourism_status = 'premium'`
- Seta `premium_tourism_promoted_at = now()`

---

## Testes de Validação

### 1. Criar, Aprovar, Ativar
```bash
API=https://api.kaviar.com.br
ADMIN_TOKEN="<token>"

# Criar
TS=$(date +%s)
RESP=$(curl -sS -X POST "$API/api/admin/drivers/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Driver Premium Test\",\"phone\":\"+5521999$TS\",\"email\":\"driver.premium.$TS@kaviar.com.br\"}")

DRIVER_ID=$(echo "$RESP" | jq -r '.data.id')
echo "DRIVER_ID=$DRIVER_ID"

# Aprovar
curl -sS -X PATCH "$API/api/admin/drivers/$DRIVER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Ativar (seta active_since)
curl -sS -X PATCH "$API/api/admin/drivers/$DRIVER_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Esperado:**
```json
{
  "success": true,
  "driver": {
    "id": "driver-123",
    "status": "active",
    "activeSince": "2026-02-11T23:55:00.000Z"
  }
}
```

---

### 2. Verificar Elegibilidade (0/6 meses)
```bash
curl -sS "$API/api/admin/drivers/$DRIVER_ID/premium-eligibility" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Esperado:**
```json
{
  "success": true,
  "data": {
    "monthsActive": 0,
    "requiredMonths": 6,
    "eligibleByTime": false,
    "eligible": false,
    "currentPremiumTourismStatus": "standard"
  }
}
```

---

### 3. Tentar Promover Antes do Tempo (deve bloquear)
```bash
curl -sS -X PATCH "$API/api/admin/drivers/$DRIVER_ID/promote-premium-tourism" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Esperado:**
```json
{
  "success": false,
  "error": "Not eligible: requires 6 months active (current: 0)"
}
```
**Status:** 403 Forbidden

---

### 4. Simular 6 Meses (DEV/Staging)

**Opção A: Atualizar DB manualmente (DEV only)**
```sql
UPDATE drivers 
SET active_since = NOW() - INTERVAL '6 months' 
WHERE id = '<driver_id>';
```

**Opção B: Ajustar env (DEV only)**
```bash
PREMIUM_TOURISM_MIN_MONTHS=0 npm run dev:3003
```

Depois:
```bash
curl -sS -X PATCH "$API/api/admin/drivers/$DRIVER_ID/promote-premium-tourism" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Esperado:**
```json
{
  "success": true,
  "data": {
    "driverId": "driver-123",
    "premiumTourismStatus": "premium",
    "promotedAt": "2026-02-11T23:55:00.000Z"
  }
}
```

---

## Frontend (Pendente)

### Componente: PremiumEligibilityCard.jsx

**Localização:** `frontend-app/src/components/admin/PremiumEligibilityCard.jsx`

**Props:**
- `driverId` (string)

**Funcionalidade:**
1. Fetch `GET /api/admin/drivers/:id/premium-eligibility`
2. Exibir:
   - Status do motorista
   - "Ativo desde: DD/MM/YYYY"
   - "Meses ativos: X / 6"
   - "Docs OK: Pendente" (se null)
   - "Termos OK: Pendente" (se null)
3. Botão "Promover para Premium Turismo":
   - Desabilitado se `eligible === false`
   - Tooltip: "Requer 6 meses ativo" (se não elegível)
   - Ao clicar: `PATCH /api/admin/drivers/:id/promote-premium-tourism`
   - Mostrar sucesso/erro e refetch

**Integração:**
- Adicionar em `frontend-app/src/pages/admin/DriverDetail.jsx`
- Próximo aos cards de documentos/termos

---

## Critérios de Aceite

- [x] `active_since` gravado na primeira ativação
- [x] `active_since` nunca reseta (não sobrescreve)
- [x] Endpoint `premium-eligibility` retorna `monthsActive`, `requiredMonths=6`, `eligibleByTime`
- [x] Endpoint `promote-premium-tourism` bloqueia antes de 6 meses (403)
- [x] Endpoint `promote-premium-tourism` promove após elegível (200)
- [x] Validações: 400 (not active/no activeSince), 409 (already premium)
- [x] Build sem erros
- [x] Logs estruturados (T1) continuam funcionando
- [ ] Card no DriverDetail (frontend - pendente)
- [ ] Deploy PROD (pendente)

---

## Próximos Passos

1. **Frontend:** Criar `PremiumEligibilityCard.jsx` e integrar em `DriverDetail.jsx`
2. **Migration PROD:** Aplicar migration `add_driver_active_since_and_premium_tourism`
3. **Deploy:** Backend + Frontend para PROD
4. **Validação:** Testar fluxo completo em PROD
5. **Docs/Terms Check:** Implementar validação real (se necessário)

---

## Arquivos Modificados

**Backend:**
- `prisma/schema.prisma` (campos + índices)
- `src/routes/admin-drivers.ts` (activate + 2 novos endpoints)

---

**Commit:** bb9cdd1  
**Status:** ✅ BACKEND COMPLETO - Aguardando frontend + deploy

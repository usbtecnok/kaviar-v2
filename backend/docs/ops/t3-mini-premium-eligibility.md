# T3-mini: Premium Driver Eligibility (Tenure-Based)

**Data:** 2026-02-12 00:07 BRT  
**Status:** ✅ COMPLETO (Backend + Frontend)

---

## Objetivo

Adicionar cálculo de "tempo de plataforma" e "elegibilidade premium" para motoristas, exibindo no DriverDetail com card visual.

---

## Regras MVP

1. **tenureMonths** = meses desde `createdAt` (floor(days/30))
2. **eligiblePremium** = (tenureMonths >= 6) AND (docsOk) AND (termsOk)
3. **docsOk**: true se `certidao_nada_consta_url` existe
4. **termsOk**: true se `driver_consents` record existe

---

## Backend Implementado

### Endpoint: GET /api/admin/drivers/:id/eligibility

**Auth:** allowReadAccess (admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "driverId": "driver-123",
    "createdAt": "2025-08-12T00:00:00.000Z",
    "tenureMonths": 6,
    "tenureLabel": "há 6 meses",
    "docsOk": true,
    "termsOk": true,
    "eligiblePremium": true,
    "reasons": []
  }
}
```

**Reasons (quando não elegível):**
- `TENURE_LT_6`: tenureMonths < 6
- `DOCS_PENDING`: certidao_nada_consta_url não existe
- `TERMS_NOT_ACCEPTED`: driver_consents não existe

**Lógica:**
```typescript
const diffMs = now.getTime() - createdAt.getTime();
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
const tenureMonths = Math.floor(diffDays / 30);

const docsOk = !!driver.certidao_nada_consta_url;
const termsOk = !!driver.driver_consents;

const eligiblePremium = tenureMonths >= 6 && docsOk && termsOk;
```

---

## Frontend Implementado

### Componente: DriverPremiumEligibilityCard

**Localização:** `frontend-app/src/components/admin/DriverPremiumEligibilityCard.jsx`

**Props:**
- `driverId` (string)

**UI:**
```
┌─────────────────────────────────────────────┐
│ KAVIAR PREMIUM (Turismo)      [✅ Elegível] │
│                                             │
│ ⏰ Tempo de plataforma: há 6 meses         │
│ 📄 Documentos: OK                           │
│ ⚖️  Termos: OK                              │
│                                             │
│ ✅ Motorista elegível para promoção         │
└─────────────────────────────────────────────┘
```

**Badges:**
- ✅ **Elegível** (green): eligiblePremium = true
- ⏳ **Em Progresso** (yellow): tenureMonths >= 3 mas não elegível
- ❌ **Não Elegível** (red): tenureMonths < 3

**Reasons Labels:**
- `TENURE_LT_6` → "Precisa completar 6 meses na plataforma"
- `DOCS_PENDING` → "Documentos pendentes"
- `TERMS_NOT_ACCEPTED` → "Termos ainda não aceitos"

**Integração:**
- Adicionado em `DriverDetail.jsx` antes do `VirtualFenceCenterCard`

---

## Testes de Validação

### 1. Criar Driver e Verificar Elegibilidade

```bash
API=https://api.kaviar.com.br
ADMIN_TOKEN="<token>"

# Criar driver
TS=$(date +%s)
RESP=$(curl -sS -X POST "$API/api/admin/drivers/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Driver Test\",\"phone\":\"+5521999$TS\",\"email\":\"driver.$TS@kaviar.com.br\"}")

DRIVER_ID=$(echo "$RESP" | jq -r '.data.id')
echo "DRIVER_ID=$DRIVER_ID"

# Verificar elegibilidade (recém-criado = 0 meses)
curl -sS "$API/api/admin/drivers/$DRIVER_ID/eligibility" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Esperado:**
```json
{
  "success": true,
  "data": {
    "tenureMonths": 0,
    "tenureLabel": "menos de 1 mês",
    "docsOk": false,
    "termsOk": false,
    "eligiblePremium": false,
    "reasons": ["TENURE_LT_6", "DOCS_PENDING", "TERMS_NOT_ACCEPTED"]
  }
}
```

---

### 2. Simular Driver Antigo (DEV/Staging)

**Opção A: Atualizar DB manualmente (DEV only)**
```sql
-- Simular driver com 6 meses
UPDATE drivers 
SET created_at = NOW() - INTERVAL '6 months',
    certidao_nada_consta_url = 'https://example.com/doc.pdf'
WHERE id = '<driver_id>';

-- Criar driver_consents
INSERT INTO driver_consents (driver_id, terms_accepted, created_at, updated_at)
VALUES ('<driver_id>', true, NOW(), NOW());
```

**Opção B: Seed com createdAt retroativo**
```typescript
// prisma/seed-drivers-old.ts
await prisma.drivers.create({
  data: {
    id: 'seed-old-driver-1',
    name: 'Driver Antigo',
    email: 'old@seed.kaviar.local',
    phone: '+5521999900001',
    status: 'active',
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 meses atrás
    certidao_nada_consta_url: 'https://example.com/doc.pdf',
    updated_at: new Date(),
    driver_consents: {
      create: {
        terms_accepted: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    }
  }
});
```

Depois:
```bash
curl -sS "$API/api/admin/drivers/<old_driver_id>/eligibility" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Esperado:**
```json
{
  "success": true,
  "data": {
    "tenureMonths": 6,
    "tenureLabel": "há 6 meses",
    "docsOk": true,
    "termsOk": true,
    "eligiblePremium": true,
    "reasons": []
  }
}
```

---

### 3. Frontend (DriverDetail)

```bash
# Acessar
open https://app.kaviar.com.br/admin/drivers/<driver_id>

# Verificar card "KAVIAR PREMIUM (Turismo)"
# - Badge: ❌ Não Elegível (driver recém-criado)
# - Tempo: "menos de 1 mês"
# - Docs: Pendente
# - Termos: Pendente
# - Reasons: lista com 3 itens
```

---

## Critérios de Aceite

- [x] Endpoint `eligibility` retorna 200 e reasons coerentes
- [x] `tenureMonths` calculado desde `createdAt`
- [x] `docsOk` baseado em `certidao_nada_consta_url`
- [x] `termsOk` baseado em `driver_consents`
- [x] `eligiblePremium` = (tenure >= 6) && docsOk && termsOk
- [x] DriverDetail mostra card com badge correto
- [x] Reasons exibidos com labels humanos
- [x] Nada quebra nas telas existentes
- [x] Build sem erros (backend + frontend)
- [x] Commits separados (backend + frontend)
- [ ] Deploy PROD (pendente)
- [ ] Validação em PROD (pendente)

---

## Arquivos Criados/Modificados

**Backend:**
- `src/routes/admin-drivers.ts` (novo endpoint GET /drivers/:id/eligibility)

**Frontend:**
- `src/components/admin/DriverPremiumEligibilityCard.jsx` (novo)
- `src/pages/admin/DriverDetail.jsx` (import + render)

---

## Commits

**Backend:**
```
8b432f7 - feat(premium): driver eligibility engine (tenure-based)
```

**Frontend:**
```
cef1d91 - feat(ui): premium eligibility card in driver detail
```

---

## Próximos Passos

1. **Deploy:** Backend + Frontend para PROD
2. **Validação:** Testar em PROD com driver real
3. **Seed:** Criar script para gerar drivers com createdAt retroativo (DEV/Staging)
4. **Docs/Terms:** Melhorar validação (verificar status de documentos aprovados)
5. **Promoção:** Adicionar botão "Promover para Premium" no card (quando elegível)

---

## Diferenças entre T3 e T3-mini

**T3 (original):**
- Baseado em `active_since` (data de ativação)
- Endpoint `/premium-eligibility` (active_since + 6 meses)
- Endpoint `/promote-premium-tourism` (promoção manual)

**T3-mini (implementado):**
- Baseado em `created_at` (data de cadastro)
- Endpoint `/eligibility` (created_at + 6 meses)
- Sem promoção automática (apenas visualização)

**Ambos coexistem:**
- `/premium-eligibility`: para promoção baseada em tempo ativo
- `/eligibility`: para visualização de tenure geral

---

**Status:** ✅ T3-mini COMPLETO - Aguardando deploy PROD

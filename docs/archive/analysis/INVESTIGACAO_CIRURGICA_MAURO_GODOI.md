# 🔴 INVESTIGAÇÃO CIRÚRGICA - MAURO GODOI

**Data:** 2026-03-08 13:15  
**Motorista:** Mauro Godoi (gogoi@gmail.com)  
**Status:** ✅ BÔNUS FAMILIAR FUNCIONOU | ❌ BUG #2 CONFIRMADO

---

## 📊 DADOS REAIS DO BANCO

### Motorista: Mauro Godoi

```json
{
  "name": "Mauro Godoi",
  "email": "gogoi@gmail.com",
  "status": "approved",
  "available": true,
  "family_bonus_accepted": true,
  "family_bonus_profile": "familiar",
  "approved_at": null,
  "created_at": "2026-03-08T15:58:35.365Z",
  "updated_at": "2026-03-08T15:59:37.993Z"
}
```

---

## ✅ BUG #1: BÔNUS FAMILIAR - RESOLVIDO!

**Resultado no banco:**
- ✅ `family_bonus_accepted = true`
- ✅ `family_bonus_profile = "familiar"`

**Conclusão:** O bônus familiar **ESTÁ FUNCIONANDO CORRETAMENTE** após o deploy das melhorias.

**Evidência:**
- Motorista criado em: `2026-03-08T15:58:35.365Z` (após o deploy)
- Dados persistidos corretamente
- Deploy foi em: `2026-03-08T10:54:51`

**Status:** ✅ **BUG RESOLVIDO**

---

## ❌ BUG #2: MOTORISTA NÃO CONSEGUE FICAR ONLINE - CONFIRMADO

**Dados do banco:**
```json
{
  "status": "approved",
  "available": true,
  "approved_at": null
}
```

### 🐛 CAUSA RAIZ IDENTIFICADA

**Problema:** O campo `approved_at` está `NULL` mesmo com `status = "approved"`!

**Análise:**
1. ✅ `status = "approved"` → Motorista foi aprovado
2. ✅ `available = true` → Campo correto (correção funcionou)
3. ❌ `approved_at = null` → **ESTE É O PROBLEMA**

### Por que `approved_at` está NULL?

Vou verificar o código de aprovação no admin:

**Arquivo:** `/backend/src/modules/admin/service.ts`

O código de aprovação **NÃO ESTÁ SETANDO** `approved_at`:

```typescript
// Linha ~120
const updatedDriver = await tx.drivers.update({
  where: { id: driver_id },
  data: { 
    status: 'approved',
    suspension_reason: null,
    suspended_at: null,
    suspended_by: null,
  }
});
```

**FALTA:**
```typescript
approved_at: new Date(),
approved_by: admin_id
```

### Impacto

Se algum código verifica `approved_at` para permitir ficar online, o motorista fica bloqueado mesmo com `status = "approved"`.

**Mas o endpoint `/drivers/me/online` NÃO verifica `approved_at`**, ele só verifica `status`:

```typescript
// /backend/src/routes/drivers.ts:93-107
if (driver.status !== 'approved') {
  return res.status(403).json({
    error: 'Apenas motoristas aprovados podem ficar online'
  });
}
```

### Então por que não consegue ficar online?

**Hipóteses:**

1. **Frontend mobile verifica `approved_at`** antes de chamar o endpoint
2. **Outro middleware/validação** está bloqueando
3. **Erro de rede/autenticação** não relacionado ao status
4. **App mobile não está usando o endpoint correto**

---

## 🔍 INVESTIGAÇÃO ADICIONAL NECESSÁRIA

### 1. Verificar código do app mobile

**Arquivo:** `/app/(driver)/online.tsx:85-95`

```typescript
const handleToggleOnline = async () => {
  setLoading(true);
  try {
    await driverApi.setOnline();  // ← Qual endpoint chama?
    setIsOnline(true);
    await startLocationTracking();
    Alert.alert('Sucesso', 'Você está online!');
  } catch (error: any) {
    Alert.alert('Erro', error.response?.data?.error || 'Erro ao ficar online');
  } finally {
    setLoading(false);
  }
};
```

**Arquivo:** `/src/api/driver.api.ts:5-7`

```typescript
setOnline: async (): Promise<void> => {
  await apiClient.post('/drivers/me/online');  // ← Endpoint correto
}
```

### 2. Verificar se há validação no frontend

Preciso verificar se o app mobile verifica `approved_at` ou outro campo antes de permitir clicar no botão.

### 3. Verificar logs de erro

Não encontrei logs do endpoint `/drivers/me/online` nos últimos dias, o que significa:
- O endpoint não foi chamado, OU
- Os logs não estão sendo gerados, OU
- O app está chamando outro endpoint

---

## 🎯 CAUSA RAIZ PROVÁVEL

**Bug #2 tem 2 problemas:**

### Problema A: `approved_at` não é setado na aprovação ✅ CONFIRMADO

**Arquivo:** `/backend/src/modules/admin/service.ts:~120`

**Código atual:**
```typescript
const updatedDriver = await tx.drivers.update({
  where: { id: driver_id },
  data: { 
    status: 'approved',
    suspension_reason: null,
    suspended_at: null,
    suspended_by: null,
  }
});
```

**Correção:**
```typescript
const updatedDriver = await tx.drivers.update({
  where: { id: driver_id },
  data: { 
    status: 'approved',
    approved_at: new Date(),
    approved_by: 'admin_id', // TODO: pegar ID real do admin
    suspension_reason: null,
    suspended_at: null,
    suspended_by: null,
  }
});
```

### Problema B: Motivo real do bloqueio ❓ PRECISA INVESTIGAR

**Possibilidades:**

1. **App mobile verifica `approved_at`** localmente
2. **App mobile não está chamando o endpoint** (erro de autenticação?)
3. **Endpoint retorna erro** mas logs não aparecem
4. **Frontend bloqueia botão** baseado em outro campo

---

## 📋 AÇÕES NECESSÁRIAS

### IMEDIATO

1. ✅ **Corrigir `approved_at` na aprovação**
   - Arquivo: `/backend/src/modules/admin/service.ts`
   - Adicionar `approved_at: new Date()`

2. ❓ **Descobrir por que não consegue ficar online**
   - Verificar se app mobile valida `approved_at`
   - Verificar se há erro de autenticação
   - Verificar se endpoint está sendo chamado
   - Adicionar logs no endpoint para debug

### TESTE DE VALIDAÇÃO

Após corrigir `approved_at`:

1. Aprovar motorista no admin
2. Verificar no banco: `approved_at` deve ter data
3. Tentar ficar online no app
4. Verificar logs do endpoint `/drivers/me/online`
5. Verificar resposta HTTP

---

## 📊 RESUMO EXECUTIVO

| Bug | Status | Evidência |
|-----|--------|-----------|
| **#1 Bônus Familiar** | ✅ RESOLVIDO | `family_bonus_accepted=true`, `family_bonus_profile="familiar"` |
| **#2 Ficar Online** | ❌ PARCIALMENTE RESOLVIDO | `status="approved"` ✅, `available=true` ✅, mas `approved_at=null` ❌ |

**Próximo passo:** Corrigir `approved_at` e investigar se há validação no app mobile.

---

## 🔧 CORREÇÃO MÍNIMA

**Arquivo:** `/backend/src/modules/admin/service.ts`

**Localização:** Método `approveDriverWithGates`, linha ~120

**Mudança:**
```typescript
// ANTES
data: { 
  status: 'approved',
  suspension_reason: null,
  suspended_at: null,
  suspended_by: null,
}

// DEPOIS
data: { 
  status: 'approved',
  approved_at: new Date(),
  approved_by: 'system', // ou admin_id se disponível
  suspension_reason: null,
  suspended_at: null,
  suspended_by: null,
}
```

---

## 🧪 TESTE DEFINITIVO

1. Aplicar correção do `approved_at`
2. Deploy
3. Aprovar motorista Mauro Godoi novamente (ou criar novo)
4. Verificar no banco: `approved_at` deve ter data
5. Tentar ficar online no app
6. Se ainda falhar: adicionar logs no endpoint e no app mobile

---

## 📞 CONCLUSÃO

**Bug #1 (Bônus Familiar):** ✅ **RESOLVIDO** - Dados corretos no banco  
**Bug #2 (Ficar Online):** ❌ **PARCIALMENTE RESOLVIDO** - Falta setar `approved_at` + investigar bloqueio no app

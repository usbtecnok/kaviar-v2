# 🔴 ANÁLISE CIRÚRGICA - 2 BUGS CRÍTICOS PÓS-APROVAÇÃO

**Motorista Testado:** Burrao melancia  
**Data:** 2026-03-08  
**Status:** BUGS CONFIRMADOS

---

## 🐛 BUG #1: BÔNUS FAMILIAR NÃO APARECE APÓS APROVAÇÃO

### CAUSA RAIZ

O bônus familiar **É PERSISTIDO CORRETAMENTE** no cadastro, mas o **ADMIN NÃO ESTÁ LENDO OS CAMPOS CORRETOS**.

### EVIDÊNCIAS

#### ✅ CADASTRO (governance.ts) - FUNCIONA
```typescript
// backend/src/routes/governance.ts:217-221
familyBonusAccepted: z.boolean().optional(),
familyProfile: z.string().optional(),

// Persiste corretamente:
family_bonus_accepted: familyBonusAccepted,
family_bonus_profile: familyProfile,
```

#### ❌ ADMIN LISTAGEM (admin-drivers.ts) - LENDO CORRETO
```typescript
// backend/src/routes/admin-drivers.ts:104-105
family_bonus_accepted: true,
family_bonus_profile: true,

// Normaliza para camelCase:
familyBonusAccepted: d.family_bonus_accepted,
familyBonusProfile: d.family_bonus_profile,
```

#### ❌ ADMIN APPROVAL (approval-controller.ts) - LENDO CORRETO
```typescript
// backend/src/modules/admin/approval-controller.ts:200-201
family_bonus_accepted: true,
family_bonus_profile: true,

// Normaliza:
familyBonusAccepted: d.family_bonus_accepted ?? null,
familyBonusProfile: d.family_bonus_profile ?? null,
```

#### ⚠️ FRONTEND ADMIN - FALLBACK DESNECESSÁRIO
```typescript
// frontend-app/src/pages/admin/DriverApproval.jsx:63-64
const accepted = d?.family_bonus_accepted ?? d?.familyBonusAccepted ?? d?.familyBonus?.accepted;
const profile = d?.family_bonus_profile ?? d?.familyBonusProfile ?? d?.familyBonus?.profile;
```

**PROBLEMA:** O frontend tem fallback para formatos antigos que podem estar causando confusão visual.

### ARQUIVOS ENVOLVIDOS

**Backend:**
- ✅ `/backend/src/routes/governance.ts` (cadastro - OK)
- ✅ `/backend/src/routes/admin-drivers.ts` (listagem - OK)
- ✅ `/backend/src/modules/admin/approval-controller.ts` (aprovação - OK)

**Frontend Admin:**
- ⚠️ `/frontend-app/src/pages/admin/DriverApproval.jsx` (fallback confuso)
- ⚠️ `/frontend-app/src/pages/admin/DriverDetail.jsx` (fallback confuso)

**Schema:**
- ✅ `/backend/prisma/schema.prisma` (campos existem)

### CORREÇÃO

O backend está correto. O problema é **visual no frontend** ou **dados não foram persistidos no teste**.

**Verificar primeiro:**
```sql
-- Ver query em /tmp/inspect_driver.sql
SELECT name, family_bonus_accepted, family_bonus_profile 
FROM drivers 
WHERE name ILIKE '%Burrao%melancia%';
```

Se os dados estiverem no banco, o problema é apenas visual no frontend (fallback pegando valor errado).

---

## 🐛 BUG #2: MOTORISTA APROVADO NÃO CONSEGUE FICAR ONLINE

### CAUSA RAIZ

O endpoint `/drivers/me/online` **ATUALIZA O CAMPO ERRADO**.

#### ❌ ENDPOINT ATUAL (drivers.ts)
```typescript
// backend/src/routes/drivers.ts:93-107
router.post('/me/online', authenticateDriver, async (req: Request, res: Response) => {
  await prisma.drivers.update({
    where: { id: driverId },
    data: {
      status: 'online',  // ❌ ERRADO! Campo status é para approved/pending/suspended
      last_active_at: new Date(),
      updated_at: new Date()
    }
  });
});
```

**PROBLEMA:** O endpoint está setando `status = 'online'`, mas:
1. O campo `status` é para **aprovação** (pending/approved/suspended/rejected)
2. O campo correto para disponibilidade é `available` (boolean)

#### ✅ ENDPOINT CORRETO (driver-availability.ts)
```typescript
// backend/src/routes/driver-availability.ts:28-43
router.put('/me/availability', authenticateDriver, async (req: Request, res: Response) => {
  await prisma.drivers.update({
    where: { id: driverId },
    data: { 
      available,  // ✅ CORRETO!
      available_updated_at: new Date()
    }
  });
});
```

#### ❌ APP MOBILE CHAMANDO ENDPOINT ERRADO
```typescript
// src/api/driver.api.ts:5-7
setOnline: async (): Promise<void> => {
  await apiClient.post('/drivers/me/online');  // ❌ Endpoint errado
}
```

**DEVERIA CHAMAR:**
```typescript
await apiClient.put('/drivers/me/availability', { available: true });
```

### EVIDÊNCIAS

**Schema do banco:**
```prisma
// backend/prisma/schema.prisma:192
status      String   // pending | approved | suspended | rejected
available   Boolean? @default(true)  // true = online, false = offline
```

**Endpoint correto existe mas não é usado:**
- ✅ `/backend/src/routes/driver-availability.ts` (implementado)
- ✅ Registrado em `/backend/src/app.ts:213`
- ❌ App mobile não usa

### ARQUIVOS ENVOLVIDOS

**Backend:**
- ❌ `/backend/src/routes/drivers.ts:93-107` (endpoint errado)
- ✅ `/backend/src/routes/driver-availability.ts` (endpoint correto)

**Mobile:**
- ❌ `/src/api/driver.api.ts` (chamando endpoint errado)
- ❌ `/app/(driver)/online.tsx` (usando API errada)

**Schema:**
- ✅ `/backend/prisma/schema.prisma` (campos corretos)

### CORREÇÃO

**Opção 1: Corrigir endpoint `/drivers/me/online` (MÍNIMO)**
```typescript
// backend/src/routes/drivers.ts
router.post('/me/online', authenticateDriver, async (req: Request, res: Response) => {
  const driverId = (req as any).userId;
  
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: { status: true }
  });
  
  if (driver?.status !== 'approved') {
    return res.status(403).json({
      success: false,
      error: 'Apenas motoristas aprovados podem ficar online'
    });
  }

  await prisma.drivers.update({
    where: { id: driverId },
    data: {
      available: true,
      available_updated_at: new Date(),
      last_active_at: new Date()
    }
  });

  res.json({ success: true, available: true });
});
```

**Opção 2: Migrar para endpoint correto (IDEAL)**
```typescript
// src/api/driver.api.ts
setOnline: async (): Promise<void> => {
  await apiClient.put('/drivers/me/availability', { available: true });
}
```

---

## 📊 QUERY SQL PARA INSPEÇÃO

```sql
-- Ver arquivo completo em /tmp/inspect_driver.sql

-- 1. Dados básicos do motorista
SELECT 
  id, name, email, status,
  family_bonus_accepted,
  family_bonus_profile,
  available,
  approved_at
FROM drivers 
WHERE name ILIKE '%Burrao%melancia%';

-- 2. Documentos enviados
SELECT 
  d.name, dd.type, dd.status, dd.verified_at
FROM drivers d
LEFT JOIN driver_documents dd ON d.id = dd.driver_id
WHERE d.name ILIKE '%Burrao%melancia%'
ORDER BY dd.created_at DESC;

-- 3. Verificação de elegibilidade
SELECT 
  d.name, dv.status, dv.approved_at
FROM drivers d
LEFT JOIN driver_verifications dv ON d.id = dv.driver_id
WHERE d.name ILIKE '%Burrao%melancia%';
```

---

## 🔧 CORREÇÕES MÍNIMAS

### BUG #1: Bônus Familiar

**Verificar primeiro se dados estão no banco:**
```bash
# Rodar query SQL acima
```

**Se dados não estiverem no banco:**
- Bug no cadastro mobile (verificar payload enviado)

**Se dados estiverem no banco:**
- Limpar fallbacks confusos no frontend admin

### BUG #2: Ficar Online

**Correção imediata (1 arquivo):**

```typescript
// backend/src/routes/drivers.ts:93-107
router.post('/me/online', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;

    // Verificar se motorista está aprovado
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { status: true }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    if (driver.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Apenas motoristas aprovados podem ficar online',
        currentStatus: driver.status
      });
    }

    // Atualizar campo correto
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        available: true,
        available_updated_at: new Date(),
        last_active_at: new Date()
      }
    });

    res.json({
      success: true,
      available: true
    });
  } catch (error) {
    console.error('Error setting driver online:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status'
    });
  }
});
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Após correção do Bug #2:

1. ✅ Aprovar motorista no admin
2. ✅ Verificar no banco: `status = 'approved'`
3. ✅ Tentar ficar online no app
4. ✅ Verificar no banco: `available = true`
5. ✅ Verificar mensagem de erro se status != approved

### Após verificação do Bug #1:

1. ✅ Cadastrar motorista com bônus familiar
2. ✅ Verificar no banco: `family_bonus_accepted = true`, `family_bonus_profile = 'familiar'`
3. ✅ Verificar na listagem do admin
4. ✅ Verificar no detalhe do motorista
5. ✅ Aprovar e verificar se dados persistem

---

## 🎯 RESUMO EXECUTIVO

| Bug | Causa Raiz | Arquivo | Correção |
|-----|-----------|---------|----------|
| **#1 Bônus Familiar** | Dados não persistidos OU frontend lendo errado | Verificar banco primeiro | Depende do resultado da query |
| **#2 Ficar Online** | Endpoint atualizando campo errado (`status` em vez de `available`) | `/backend/src/routes/drivers.ts:93-107` | Trocar `status: 'online'` por `available: true` + validar `status === 'approved'` |

**Prioridade:** Bug #2 é crítico e bloqueia operação. Corrigir primeiro.
